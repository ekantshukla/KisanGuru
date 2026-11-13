namespace KisanGuru.Api.Options;

/// <summary>Settings for live mandi prices from the data.gov.in (Agmarknet) open API.</summary>
public class MandiOptions
{
    public const string SectionName = "Mandi";

    /// <summary>Free API key from https://data.gov.in (My Account → API key). Empty = sample data.</summary>
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.data.gov.in/resource/";
    /// <summary>"Current Daily Price of Various Commodities from Various Markets (Mandi)" dataset.</summary>
    public string ResourceId { get; set; } = "9ef84268-d588-465a-a308-a864a43d0070";
    public int Limit { get; set; } = 100;
}

/// <summary>
/// Weather and village/tehsil place search from Open-Meteo. The free endpoints need no key but are for
/// non-commercial use only; for commercial use switch to the customer endpoints and add ApiKey.
/// </summary>
public class WeatherOptions
{
    public const string SectionName = "Weather";

    public string ForecastUrl { get; set; } = "https://api.open-meteo.com/v1/forecast";
    /// <summary>Place search used to find the farmer's village/tehsil (GeoNames data via Open-Meteo).</summary>
    public string GeocodingUrl { get; set; } = "https://geocoding-api.open-meteo.com/v1/search";
    public string ApiKey { get; set; } = string.Empty;
}

/// <summary>Settings for the AI farming assistant (Claude API).</summary>
public class AdvisoryOptions
{
    public const string SectionName = "Advisory";

    /// <summary>Anthropic API key. Keep it in user-secrets or an environment variable, never in git.</summary>
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.anthropic.com/v1/messages";
    public string Model { get; set; } = "claude-sonnet-5-5";
    public int MaxTokens { get; set; } = 1024;
}
