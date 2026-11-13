using System.Globalization;
using System.Text.Json;
using KisanGuru.Api.Models;
using KisanGuru.Api.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace KisanGuru.Api.Services;

public interface IWeatherService
{
    Task<WeatherForecast?> GetForecastAsync(double latitude, double longitude, CancellationToken ct);
}

/// <summary>
/// A 7-day forecast (rain, temperature, wind) from Open-Meteo,
/// plus simple farming alerts worked out from the forecast.
/// Forecasts are cached for 30 minutes per ~1 km grid cell to stay well inside fair-use limits.
/// </summary>
public class WeatherService : IWeatherService
{
    private readonly HttpClient _http;
    private readonly WeatherOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<WeatherService> _logger;

    public WeatherService(HttpClient http, IOptions<WeatherOptions> options, IMemoryCache cache, ILogger<WeatherService> logger)
    {
        _http = http;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    public async Task<WeatherForecast?> GetForecastAsync(double latitude, double longitude, CancellationToken ct)
    {
        var lat = Math.Round(latitude, 2);
        var lon = Math.Round(longitude, 2);
        var cacheKey = $"wx:{lat}:{lon}";
        if (_cache.TryGetValue(cacheKey, out WeatherForecast? cached)) return cached;

        var inv = CultureInfo.InvariantCulture;
        var url = $"{_options.ForecastUrl}?latitude={lat.ToString(inv)}&longitude={lon.ToString(inv)}" +
                  "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation" +
                  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max" +
                  $"&timezone=Asia%2FKolkata&forecast_days=7{KeyParam()}";

        try
        {
            using var doc = await GetJsonAsync(url, ct);
            var root = doc.RootElement;

            var c = root.GetProperty("current");
            var current = new CurrentWeather(
                Num(c, "temperature_2m"), (int)Num(c, "relative_humidity_2m"), (int)Num(c, "weather_code"),
                Num(c, "wind_speed_10m"), Num(c, "precipitation"));

            var d = root.GetProperty("daily");
            var dates = d.GetProperty("time").EnumerateArray().Select(x => x.GetString() ?? "").ToList();
            var codes = Arr(d, "weather_code");
            var tMax = Arr(d, "temperature_2m_max");
            var tMin = Arr(d, "temperature_2m_min");
            var rain = Arr(d, "precipitation_sum");
            var chance = Arr(d, "precipitation_probability_max");
            var wind = Arr(d, "wind_speed_10m_max");

            var days = dates.Select((date, i) => new WeatherDay(
                date, (int)At(codes, i), At(tMax, i), At(tMin, i),
                Math.Round(At(rain, i), 1), (int)At(chance, i), At(wind, i))).ToList();

            var forecast = new WeatherForecast(
                current, days, FarmAlerts.From(days), Math.Round(days.Sum(x => x.RainMm), 1), "Open-Meteo");

            _cache.Set(cacheKey, forecast, TimeSpan.FromMinutes(30));
            return forecast;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException or InvalidOperationException)
        {
            _logger.LogWarning(ex, "Forecast failed for {Lat},{Lon}", lat, lon);
            return null;
        }
    }

    private async Task<JsonDocument> GetJsonAsync(string url, CancellationToken ct)
    {
        using var response = await _http.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
    }

    private string KeyParam() =>
        string.IsNullOrWhiteSpace(_options.ApiKey) ? "" : $"&apikey={Uri.EscapeDataString(_options.ApiKey)}";

    private static double Num(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDouble() : 0;

    private static List<double?> Arr(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Array
            ? v.EnumerateArray().Select(x => x.ValueKind == JsonValueKind.Number ? x.GetDouble() : (double?)null).ToList()
            : new List<double?>();

    private static double At(List<double?> list, int i) => i < list.Count ? list[i] ?? 0 : 0;
}

/// <summary>Rule-based advice from the forecast. Thresholds are simple, conservative field rules.</summary>
public static class FarmAlerts
{
    public static IReadOnlyList<FarmAlert> From(IReadOnlyList<WeatherDay> days)
    {
        var alerts = new List<FarmAlert>();
        var next3 = days.Take(3).ToList();

        var heavy = next3.FirstOrDefault(d => d.RainMm >= 20);
        if (heavy is not null)
        {
            alerts.Add(new("danger", "⛈️", new(
                $"{DayHi(days, heavy)} भारी बारिश ({heavy.RainMm} मिमी) की संभावना। कटी फसल ढककर रखें, खेत से पानी निकालने की नाली साफ़ करें, सिंचाई और छिड़काव न करें।",
                $"Heavy rain ({heavy.RainMm} mm) likely {DayEn(days, heavy)}. Cover harvested produce, clear field drainage, and skip irrigation and spraying.")));
        }
        else
        {
            var rainy = next3.FirstOrDefault(d => d.RainChance >= 60 && d.RainMm >= 2);
            if (rainy is not null)
            {
                alerts.Add(new("warning", "🌧️", new(
                    $"{DayHi(days, rainy)} बारिश की {rainy.RainChance}% संभावना। दवा/खाद का छिड़काव और सिंचाई टाल दें।",
                    $"{rainy.RainChance}% chance of rain {DayEn(days, rainy)}. Hold off spraying, fertiliser top-dressing and irrigation.")));
            }
        }

        if (next3.Any(d => d.TempMin <= 4))
        {
            alerts.Add(new("danger", "❄️", new(
                "पाला पड़ने का खतरा। शाम को हल्की सिंचाई करें और खेत की मेड़ पर धुआं करें। सरसों, चना और सब्ज़ियों का खास ध्यान रखें।",
                "Frost risk. Give a light irrigation in the evening and make smoke along the field edges. Protect mustard, chickpea and vegetables.")));
        }

        if (next3.Any(d => d.TempMax >= 40))
        {
            alerts.Add(new("warning", "🔥", new(
                "तेज़ गर्मी (40°C से ऊपर)। सिंचाई सुबह या शाम करें, पशुओं को छाया और पानी दें, दोपहर में काम न करें।",
                "Severe heat (above 40°C). Irrigate in the early morning or evening, give animals shade and water, and avoid field work at midday.")));
        }

        if (next3.Any(d => d.WindMax >= 25))
        {
            alerts.Add(new("warning", "💨", new(
                "तेज़ हवा चलेगी। छिड़काव न करें, दवा उड़कर बेकार जाएगी। ऊंची फसल गिर सकती है।",
                "Strong winds expected. Don't spray, as the chemical will drift. Tall crops may lodge.")));
        }

        if (days.Count >= 7 && days.Sum(d => d.RainMm) < 2 && days.Average(d => d.TempMax) >= 30)
        {
            alerts.Add(new("info", "💧", new(
                "अगले 7 दिन बारिश के आसार नहीं। अपनी फसल की अवस्था के अनुसार सिंचाई की योजना बनाएं।",
                "No rain expected for 7 days. Plan irrigation according to your crop's stage.")));
        }

        if (alerts.Count == 0 || alerts.All(a => a.Level == "info"))
        {
            var dry = next3.All(d => d.RainChance < 30 && d.WindMax < 20);
            if (dry)
            {
                alerts.Add(new("info", "✅", new(
                    "अगले 3 दिन मौसम साफ़ और हवा धीमी। छिड़काव और खेत के काम के लिए अच्छा समय।",
                    "Clear weather and light winds for the next 3 days. A good window for spraying and field work.")));
            }
        }

        return alerts;
    }

    private static string DayHi(IReadOnlyList<WeatherDay> days, WeatherDay d) =>
        IndexOf(days, d) switch { 0 => "आज", 1 => "कल", _ => "परसों" };

    private static string DayEn(IReadOnlyList<WeatherDay> days, WeatherDay d) =>
        IndexOf(days, d) switch { 0 => "today", 1 => "tomorrow", _ => "the day after tomorrow" };

    private static int IndexOf(IReadOnlyList<WeatherDay> days, WeatherDay d)
    {
        for (var i = 0; i < days.Count; i++) if (ReferenceEquals(days[i], d)) return i;
        return 0;
    }
}
