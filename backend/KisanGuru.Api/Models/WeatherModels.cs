namespace KisanGuru.Api.Models;

public record CurrentWeather(
    double Temperature,
    int Humidity,
    int WeatherCode,
    double WindSpeed,
    double Precipitation);

public record WeatherDay(
    string Date,
    int WeatherCode,
    double TempMax,
    double TempMin,
    double RainMm,
    int RainChance,   // %
    double WindMax);  // km/h

/// <summary>Severity: "danger" | "warning" | "info".</summary>
public record FarmAlert(string Level, string Icon, LocalizedText Message);

public record WeatherForecast(
    CurrentWeather Current,
    IReadOnlyList<WeatherDay> Days,
    IReadOnlyList<FarmAlert> Alerts,
    double RainNext7DaysMm,
    string Source,
    string? PlaceLevel = null,   // "village" | "tehsil" | "district": what the forecast is for
    string? PlaceName = null);
