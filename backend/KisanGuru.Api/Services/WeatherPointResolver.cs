using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;
using KisanGuru.Api.Options;
using Microsoft.Extensions.Options;

namespace KisanGuru.Api.Services;

/// <summary>Where the forecast is for: "village", "tehsil" or "district".</summary>
public record WeatherPoint(double Latitude, double Longitude, string Level, string Name);

public interface IWeatherPointResolver
{
    Task<WeatherPoint> ResolveAsync(
        string? state, string? district, string? tehsil, string? village,
        double districtLat, double districtLon, bool approximate, CancellationToken ct);
}

/// <summary>
/// The LGD lists have no coordinates, so the farmer's village (or else tehsil) is looked up by name with
/// Open-Meteo's free place search (GeoNames). A result counts only if it is in the same state and close to
/// the district — village names repeat a lot. Otherwise the district centre is used. Answers are cached for
/// the life of the process, so each place is looked up once.
/// </summary>
public partial class WeatherPointResolver : IWeatherPointResolver
{
    private static readonly ConcurrentDictionary<string, (double Lat, double Lon)?> Cache = new();

    private readonly HttpClient _http;
    private readonly WeatherOptions _options;
    private readonly ILogger<WeatherPointResolver> _logger;

    public WeatherPointResolver(HttpClient http, IOptions<WeatherOptions> options, ILogger<WeatherPointResolver> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<WeatherPoint> ResolveAsync(
        string? state, string? district, string? tehsil, string? village,
        double districtLat, double districtLon, bool approximate, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(state))
        {
            // New districts only have a rough centre, so allow a wider radius for them.
            var maxKm = approximate ? 200 : 60;
            foreach (var (name, level) in new[] { (village, "village"), (tehsil, "tehsil"), (approximate ? district : null, "district") })
            {
                if (string.IsNullOrWhiteSpace(name)) continue;
                var hit = await LookupAsync(name, state, districtLat, districtLon, maxKm, ct);
                if (hit is { } p) return new WeatherPoint(p.Lat, p.Lon, level, name);
            }
        }
        return new WeatherPoint(districtLat, districtLon, "district", district ?? "");
    }

    private async Task<(double Lat, double Lon)?> LookupAsync(string name, string state, double nearLat, double nearLon, double maxKm, CancellationToken ct)
    {
        var key = $"{Norm(state)}|{Norm(name)}|{Math.Round(nearLat, 1)}|{Math.Round(nearLon, 1)}|{maxKm}";
        if (Cache.TryGetValue(key, out var cached)) return cached;

        (double, double)? best = null;
        try
        {
            var url = $"{_options.GeocodingUrl}?name={Uri.EscapeDataString(CleanName(name))}&count=20&language=en&countryCode=IN&format=json"
                      + (string.IsNullOrWhiteSpace(_options.ApiKey) ? "" : $"&apikey={Uri.EscapeDataString(_options.ApiKey)}");
            using var response = await _http.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));

            if (doc.RootElement.TryGetProperty("results", out var results))
            {
                var wantedState = Norm(state);
                var bestKm = double.MaxValue;
                foreach (var r in results.EnumerateArray())
                {
                    var admin1 = r.TryGetProperty("admin1", out var a) ? a.GetString() ?? "" : "";
                    if (Norm(admin1) != wantedState) continue;
                    var lat = r.GetProperty("latitude").GetDouble();
                    var lon = r.GetProperty("longitude").GetDouble();
                    var km = Haversine(lat, lon, nearLat, nearLon);
                    if (km <= maxKm && km < bestKm) { bestKm = km; best = (lat, lon); }
                }
            }
            Cache[key] = best;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException)
        {
            _logger.LogWarning(ex, "Place lookup failed for {Name}, {State}", name, state);  // not cached: try again next time
        }
        return best;
    }

    /// <summary>LGD names carry notes like "Aawan Basu (28)" or "Rampur Urf Ramnagar"; search the first name only.</summary>
    private static string CleanName(string name)
    {
        var n = Brackets().Replace(name, " ");
        n = Alias().Split(n)[0];
        return n.Trim();
    }

    private static string Norm(string s) => NonLetters().Replace(s.ToLowerInvariant().Replace("&", "and"), "");

    private static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        static double R(double x) => x * Math.PI / 180;
        var dLat = R(lat2 - lat1);
        var dLon = R(lon2 - lon1);
        var a = Math.Pow(Math.Sin(dLat / 2), 2) + Math.Cos(R(lat1)) * Math.Cos(R(lat2)) * Math.Pow(Math.Sin(dLon / 2), 2);
        return 6371 * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    [GeneratedRegex(@"\(.*?\)")] private static partial Regex Brackets();
    [GeneratedRegex(@"\s(?:urf|alias|@)\s", RegexOptions.IgnoreCase)] private static partial Regex Alias();
    [GeneratedRegex(@"[^a-z]")] private static partial Regex NonLetters();
}
