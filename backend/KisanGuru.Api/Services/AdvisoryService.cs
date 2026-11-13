using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using KisanGuru.Api.Models;
using KisanGuru.Api.Options;
using Microsoft.Extensions.Options;

namespace KisanGuru.Api.Services;

public interface IAdvisoryService
{
    Task<AdvisoryResponse> AskAsync(AdvisoryRequest request, CancellationToken ct);
}

/// <summary>
/// "Kisan Sahayak": answers farming questions and diagnoses crop photos using the Claude API.
/// The API key stays on the server; the Angular app never sees it.
/// </summary>
public class AdvisoryService : IAdvisoryService
{
    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp"
    };

    private readonly HttpClient _http;
    private readonly AdvisoryOptions _options;
    private readonly ILogger<AdvisoryService> _logger;

    public AdvisoryService(HttpClient http, IOptions<AdvisoryOptions> options, ILogger<AdvisoryService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AdvisoryResponse> AskAsync(AdvisoryRequest request, CancellationToken ct)
    {
        var lang = Languages.Normalize(request.Language);
        var hindi = lang is "hi" or "mr"; // short fallback messages: Hindi for Devanagari readers, English otherwise

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return new AdvisoryResponse(hindi
                ? "AI सहायक अभी चालू नहीं है। अपने सवाल के लिए किसान कॉल सेंटर 1800-180-1551 पर मुफ्त कॉल करें।"
                : "The AI assistant is not switched on yet. For your question, call the Kisan Call Centre free on 1800-180-1551.",
                false);
        }

        var content = new List<object>();
        if (!string.IsNullOrWhiteSpace(request.ImageBase64) &&
            request.ImageMediaType is not null && AllowedImageTypes.Contains(request.ImageMediaType))
        {
            content.Add(new
            {
                type = "image",
                source = new { type = "base64", media_type = request.ImageMediaType, data = request.ImageBase64 }
            });
        }
        content.Add(new { type = "text", text = request.Question });

        var body = new
        {
            model = _options.Model,
            max_tokens = _options.MaxTokens,
            system = SystemPrompt(lang, request.Location),
            messages = BuildMessages(request.History, content)
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        httpRequest.Headers.Add("x-api-key", _options.ApiKey);
        httpRequest.Headers.Add("anthropic-version", "2023-06-01");
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            using var response = await _http.SendAsync(httpRequest, ct);
            var json = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Claude API returned {Status}: {Body}", (int)response.StatusCode, json);
                return Unavailable(hindi);
            }

            using var doc = JsonDocument.Parse(json);
            var sb = new StringBuilder();
            foreach (var block in doc.RootElement.GetProperty("content").EnumerateArray())
            {
                if (block.TryGetProperty("type", out var t) && t.GetString() == "text")
                    sb.Append(block.GetProperty("text").GetString());
            }

            var answer = sb.ToString().Trim();
            return answer.Length > 0 ? new AdvisoryResponse(answer, true) : Unavailable(hindi);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException)
        {
            _logger.LogWarning(ex, "Advisory request failed");
            return Unavailable(hindi);
        }
    }

    /// <summary>Earlier turns (trimmed, alternating, starting with the farmer) followed by the new question.</summary>
    private static List<object> BuildMessages(IReadOnlyList<ChatTurn>? history, List<object> content)
    {
        var messages = new List<object>();
        var expect = "user";
        foreach (var turn in (history ?? Array.Empty<ChatTurn>()).TakeLast(8))
        {
            var role = turn.Role == "assistant" ? "assistant" : "user";
            if (role != expect || string.IsNullOrWhiteSpace(turn.Text)) continue;
            messages.Add(new { role, content = turn.Text.Length > 2000 ? turn.Text[..2000] : turn.Text });
            expect = role == "user" ? "assistant" : "user";
        }
        // The new question is from the farmer, so the history must end with an assistant turn
        if (messages.Count > 0 && expect == "assistant") messages.RemoveAt(messages.Count - 1);
        messages.Add(new { role = "user", content });
        return messages;
    }

    private static AdvisoryResponse Unavailable(bool hindi) => new(hindi
        ? "माफ़ कीजिए, अभी जवाब नहीं मिल पाया। थोड़ी देर बाद फिर कोशिश करें या किसान कॉल सेंटर 1800-180-1551 पर कॉल करें।"
        : "Sorry, I couldn't get an answer right now. Please try again shortly or call the Kisan Call Centre on 1800-180-1551.",
        true);

    private static string SystemPrompt(string lang, string? location) => $"""
        You are "AI KisanGuru" (AI किसान गुरु), a wise and friendly agricultural advisor for small farmers in India.
        {(string.IsNullOrWhiteSpace(location) ? "The farmer has not shared a location." : $"The farmer is in {location.Trim()}, India. Fit your advice to this region's soil, climate, common crops and current season.")}
        Reply in simple {Languages.NameOf(lang)}{(lang == "en" ? "" : ", written in its own native script")}, using everyday words a farmer with little schooling understands. If the farmer writes in another language, still reply in {Languages.NameOf(lang)}.
        - Give practical, step-by-step advice suited to Indian conditions, seasons (kharif, rabi, zaid) and units (acre, bigha, quintal, 15-litre spray tank).
        - If a crop photo is attached, say what problem it most likely shows, how sure you are, and what to do now. If the photo is unclear, say so and ask for a closer photo of the affected leaf or stem.
        - For pesticides or fertilisers, give the generic chemical name, dose per acre and per 15-litre tank, and safety steps (gloves, mask, no spraying in wind, waiting period before harvest). Prefer low-cost and organic options first where they work.
        - Never make up mandi prices, scheme amounts, dates or deadlines. For those, point to the official website or helpline.
        - For serious problems, advise confirming with the local Krishi Vigyan Kendra (KVK) or the Kisan Call Centre 1800-180-1551.
        - Keep the answer under 250 words, with short points.
        """;
}
