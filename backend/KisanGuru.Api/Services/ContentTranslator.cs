using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using KisanGuru.Api.Models;
using KisanGuru.Api.Options;
using Microsoft.Extensions.Options;

namespace KisanGuru.Api.Services;

public interface IContentTranslator
{
    /// <summary>English text → translation in <paramref name="lang"/>. Missing entries mean "not available".</summary>
    Task<IReadOnlyDictionary<string, string>> TranslateAsync(IEnumerable<string> english, string lang, CancellationToken ct);
}

/// <summary>
/// Translates site content (schemes, crop guide, helplines, weather alerts) from English into the
/// other Indian languages with the Claude API, once per sentence. Translations are kept in memory and
/// saved to App_Data/translations/{lang}.json, so each sentence is translated only once — commit those
/// files and the site works in every language without calling the API again.
/// Without an API key, nothing is translated and the app shows English (Hindi for Marathi).
/// </summary>
public class ContentTranslator : IContentTranslator
{
    private const int BatchSize = 40;

    private readonly HttpClient _http;
    private readonly AdvisoryOptions _options;
    private readonly ILogger<ContentTranslator> _logger;
    private readonly string _folder;
    // Static: the typed HttpClient makes this class transient, but the cache must be shared app-wide.
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>> _cache = new();
    private static readonly SemaphoreSlim _gate = new(1, 1);

    public ContentTranslator(HttpClient http, IOptions<AdvisoryOptions> options, IWebHostEnvironment env, ILogger<ContentTranslator> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
        _folder = Path.Combine(env.ContentRootPath, "App_Data", "translations");
    }

    public async Task<IReadOnlyDictionary<string, string>> TranslateAsync(IEnumerable<string> english, string lang, CancellationToken ct)
    {
        var cache = _cache.GetOrAdd(lang, LoadFile);
        var wanted = english.Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().ToList();
        var missing = wanted.Where(s => !cache.ContainsKey(s)).ToList();

        if (missing.Count > 0 && !string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            // One translation run at a time, so two farmers opening the same page don't pay twice.
            await _gate.WaitAsync(ct);
            try
            {
                missing = missing.Where(s => !cache.ContainsKey(s)).ToList();
                var added = false;
                foreach (var batch in missing.Chunk(BatchSize))
                {
                    var result = await CallClaudeAsync(batch, lang, ct);
                    if (result is null) break;
                    for (var i = 0; i < batch.Length; i++)
                    {
                        if (!string.IsNullOrWhiteSpace(result[i])) { cache[batch[i]] = result[i]; added = true; }
                    }
                }
                if (added) await SaveFileAsync(lang, cache, ct);
            }
            finally
            {
                _gate.Release();
            }
        }

        return wanted.Where(cache.ContainsKey).ToDictionary(s => s, s => cache[s]);
    }

    private async Task<string[]?> CallClaudeAsync(string[] batch, string lang, CancellationToken ct)
    {
        var language = Languages.NameOf(lang);
        var body = new
        {
            model = _options.Model,
            max_tokens = 8000,
            system = $"""
                You translate website text for Indian farmers from English into {language}, written in its own native script.
                Use simple, everyday words a village farmer uses. Keep numbers, ₹ amounts, %, units (kg, acre, quintal, mm, km/h),
                phone numbers, website addresses and scheme short names (PM-KISAN, PMFBY, KCC, e-NAM, PM-KUSUM, DAP, MOP, CSC, KVK) unchanged.
                Reply with only a JSON array of strings: the translations, in the same order and the same count as the input.
                """,
            messages = new[] { new { role = "user", content = JsonSerializer.Serialize(batch) } }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-api-key", _options.ApiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        try
        {
            using var response = await _http.SendAsync(request, ct);
            var json = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Translation to {Lang} failed: {Status} {Body}", lang, (int)response.StatusCode, json);
                return null;
            }

            using var doc = JsonDocument.Parse(json);
            var text = string.Concat(doc.RootElement.GetProperty("content").EnumerateArray()
                .Where(b => b.TryGetProperty("type", out var t) && t.GetString() == "text")
                .Select(b => b.GetProperty("text").GetString()));

            var start = text.IndexOf('[');
            var end = text.LastIndexOf(']');
            if (start < 0 || end <= start) return null;

            var arr = JsonSerializer.Deserialize<string[]>(text[start..(end + 1)]);
            return arr is not null && arr.Length == batch.Length ? arr : null;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException)
        {
            _logger.LogWarning(ex, "Translation to {Lang} failed", lang);
            return null;
        }
    }

    private ConcurrentDictionary<string, string> LoadFile(string lang)
    {
        try
        {
            var path = Path.Combine(_folder, $"{lang}.json");
            if (File.Exists(path))
            {
                var map = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(path));
                if (map is not null) return new ConcurrentDictionary<string, string>(map);
            }
        }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Could not read translations for {Lang}", lang);
        }
        return new ConcurrentDictionary<string, string>();
    }

    private async Task SaveFileAsync(string lang, ConcurrentDictionary<string, string> cache, CancellationToken ct)
    {
        try
        {
            Directory.CreateDirectory(_folder);
            var sorted = cache.OrderBy(kv => kv.Key, StringComparer.Ordinal).ToDictionary(kv => kv.Key, kv => kv.Value);
            var json = JsonSerializer.Serialize(sorted, new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            });
            await File.WriteAllTextAsync(Path.Combine(_folder, $"{lang}.json"), json, ct);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Could not save translations for {Lang}", lang);
        }
    }
}

/// <summary>Fills <see cref="LocalizedText.Local"/> on API objects for the requested language.</summary>
public class ContentLocalizer
{
    private readonly IContentTranslator _translator;
    public ContentLocalizer(IContentTranslator translator) => _translator = translator;

    public async Task<IReadOnlyList<Scheme>> SchemesAsync(IReadOnlyList<Scheme> items, string lang, CancellationToken ct)
    {
        if (!Languages.NeedsTranslation(lang)) return items;
        var map = await MapAsync(items.SelectMany(s => new[] { s.Name, s.Summary }.Concat(s.Benefits).Concat(s.HowToApply)), lang, ct);
        return items.Select(s => s with
        {
            Name = Apply(s.Name, map), Summary = Apply(s.Summary, map),
            Benefits = s.Benefits.Select(b => Apply(b, map)).ToList(),
            HowToApply = s.HowToApply.Select(h => Apply(h, map)).ToList()
        }).ToList();
    }

    public async Task<IReadOnlyList<Crop>> CropsAsync(IReadOnlyList<Crop> items, string lang, CancellationToken ct)
    {
        if (!Languages.NeedsTranslation(lang)) return items;
        var map = await MapAsync(items.SelectMany(c => new[] { c.Name, c.SowingTime, c.SeedRate, c.Irrigation }.Concat(c.Tips)), lang, ct);
        return items.Select(c => c with
        {
            Name = Apply(c.Name, map), SowingTime = Apply(c.SowingTime, map), SeedRate = Apply(c.SeedRate, map),
            Irrigation = Apply(c.Irrigation, map), Tips = c.Tips.Select(t => Apply(t, map)).ToList()
        }).ToList();
    }

    public async Task<IReadOnlyList<Helpline>> HelplinesAsync(IReadOnlyList<Helpline> items, string lang, CancellationToken ct)
    {
        if (!Languages.NeedsTranslation(lang)) return items;
        var map = await MapAsync(items.SelectMany(h => new[] { h.Name, h.Purpose }), lang, ct);
        return items.Select(h => h with { Name = Apply(h.Name, map), Purpose = Apply(h.Purpose, map) }).ToList();
    }

    public async Task<WeatherForecast> WeatherAsync(WeatherForecast forecast, string lang, CancellationToken ct)
    {
        if (!Languages.NeedsTranslation(lang) || forecast.Alerts.Count == 0) return forecast;
        var map = await MapAsync(forecast.Alerts.Select(a => a.Message), lang, ct);
        return forecast with { Alerts = forecast.Alerts.Select(a => a with { Message = Apply(a.Message, map) }).ToList() };
    }

    public async Task<SuggestResponse> SuggestionsAsync(SuggestResponse res, string lang, CancellationToken ct)
    {
        if (!Languages.NeedsTranslation(lang)) return res;
        var texts = res.Items.Select(s => s.Name).Append(res.RegionName);
        if (res.RegionTip is not null) texts = texts.Append(res.RegionTip);
        var map = await MapAsync(texts, lang, ct);
        return res with
        {
            RegionName = Apply(res.RegionName, map),
            RegionTip = res.RegionTip is null ? null : Apply(res.RegionTip, map),
            Items = res.Items.Select(s => s with { Name = Apply(s.Name, map) }).ToList()
        };
    }

    public async Task<FieldPlan> PlanAsync(FieldPlan plan, string lang, CancellationToken ct)
    {
        if (!Languages.NeedsTranslation(lang)) return plan;
        var texts = new[] { plan.CropName }
            .Concat(plan.Stages.Select(s => s.Name))
            .Concat(plan.Tasks.SelectMany(t => t.SoilNote is null ? new[] { t.Title, t.Details } : new[] { t.Title, t.Details, t.SoilNote }))
            .Concat(new[] { plan.SoilName, plan.SoilTip }.OfType<LocalizedText>());
        var map = await MapAsync(texts, lang, ct);
        return plan with
        {
            CropName = Apply(plan.CropName, map),
            Stages = plan.Stages.Select(s => s with { Name = Apply(s.Name, map) }).ToList(),
            Tasks = plan.Tasks.Select(t => t with
            {
                Title = Apply(t.Title, map), Details = Apply(t.Details, map),
                SoilNote = t.SoilNote is null ? null : Apply(t.SoilNote, map)
            }).ToList(),
            SoilName = plan.SoilName is null ? null : Apply(plan.SoilName, map),
            SoilTip = plan.SoilTip is null ? null : Apply(plan.SoilTip, map)
        };
    }

    private Task<IReadOnlyDictionary<string, string>> MapAsync(IEnumerable<LocalizedText> texts, string lang, CancellationToken ct) =>
        _translator.TranslateAsync(texts.Select(t => t.En), lang, ct);

    private static LocalizedText Apply(LocalizedText t, IReadOnlyDictionary<string, string> map) =>
        map.TryGetValue(t.En, out var v) ? t with { Local = v } : t;
}
