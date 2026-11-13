using System.Globalization;
using System.Text.Json;
using KisanGuru.Api.Data;
using KisanGuru.Api.Models;
using KisanGuru.Api.Options;
using Microsoft.Extensions.Options;

namespace KisanGuru.Api.Services;

public interface IMandiService
{
    Task<MandiResult> GetPricesAsync(string? state, string? district, string? commodity, CancellationToken ct);
}

/// <summary>
/// Live mandi prices from the government's open data API (Agmarknet data on data.gov.in).
/// With no API key configured it returns clearly labelled sample prices instead.
/// </summary>
public class MandiService : IMandiService
{
    private readonly HttpClient _http;
    private readonly MandiOptions _options;
    private readonly ILogger<MandiService> _logger;

    public MandiService(HttpClient http, IOptions<MandiOptions> options, ILogger<MandiService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<MandiResult> GetPricesAsync(string? state, string? district, string? commodity, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return Sample(state, district, commodity, "Sample data. Add a data.gov.in API key for live prices.");
        }

        try
        {
            var url = $"{_options.BaseUrl.TrimEnd('/')}/{_options.ResourceId}" +
                      $"?api-key={Uri.EscapeDataString(_options.ApiKey)}&format=json&limit={_options.Limit}";
            if (!string.IsNullOrWhiteSpace(state)) url += $"&filters[state]={Uri.EscapeDataString(state)}";
            if (!string.IsNullOrWhiteSpace(district)) url += $"&filters[district]={Uri.EscapeDataString(district)}";
            if (!string.IsNullOrWhiteSpace(commodity)) url += $"&filters[commodity]={Uri.EscapeDataString(commodity)}";

            using var response = await _http.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            var prices = new List<MandiPrice>();
            if (doc.RootElement.TryGetProperty("records", out var records) && records.ValueKind == JsonValueKind.Array)
            {
                foreach (var r in records.EnumerateArray())
                {
                    prices.Add(new MandiPrice(
                        Str(r, "state"), Str(r, "district"), Str(r, "market"),
                        Str(r, "commodity"), Str(r, "variety"), Str(r, "arrival_date"),
                        Dec(r, "min_price"), Dec(r, "max_price"), Dec(r, "modal_price")));
                }
            }

            return new MandiResult(false, "Agmarknet via data.gov.in", prices);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Live mandi price fetch failed; falling back to sample data");
            return Sample(state, district, commodity, "Live prices are unavailable right now. Showing sample data.");
        }
    }

    private static MandiResult Sample(string? state, string? district, string? commodity, string source)
    {
        IEnumerable<MandiPrice> q = SeedData.SampleMandiPrices;
        if (!string.IsNullOrWhiteSpace(state))
            q = q.Where(p => p.State.Contains(state, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(district))
            q = q.Where(p => p.District.Contains(district, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(commodity))
            q = q.Where(p => p.Commodity.Contains(commodity, StringComparison.OrdinalIgnoreCase));
        return new MandiResult(true, source, q.ToList());
    }

    private static string Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) ? (v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : v.ToString()) : "";

    private static decimal Dec(JsonElement e, string name)
    {
        if (!e.TryGetProperty(name, out var v)) return 0;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d)) return d;
        return decimal.TryParse(v.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0;
    }
}
