using KisanGuru.Api.Data;
using KisanGuru.Api.Models;
using KisanGuru.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace KisanGuru.Api.Controllers;

// Content endpoints take ?lang= (hi, en, bn, mr, te, ta, gu, kn, ml, or, pa, as).
// For languages other than Hindi/English each LocalizedText gets a cached translation in "local".

[ApiController]
[Route("api/schemes")]
public class SchemesController : ControllerBase
{
    private readonly IKnowledgeRepository _repo;
    private readonly ContentLocalizer _localizer;
    public SchemesController(IKnowledgeRepository repo, ContentLocalizer localizer) { _repo = repo; _localizer = localizer; }

    /// <summary>Government schemes, optionally filtered by category (income, insurance, credit, soil, market, energy).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Scheme>>> GetAll([FromQuery] string? category, [FromQuery] string? lang, CancellationToken ct) =>
        Ok(await _localizer.SchemesAsync(_repo.GetSchemes(category), Languages.Normalize(lang), ct));

    [HttpGet("{id}")]
    public async Task<ActionResult<Scheme>> Get(string id, [FromQuery] string? lang, CancellationToken ct)
    {
        var scheme = _repo.GetScheme(id);
        if (scheme is null) return NotFound();
        var localized = await _localizer.SchemesAsync(new[] { scheme }, Languages.Normalize(lang), ct);
        return localized[0];
    }
}

[ApiController]
[Route("api/crops")]
public class CropsController : ControllerBase
{
    private readonly IKnowledgeRepository _repo;
    private readonly ContentLocalizer _localizer;
    public CropsController(IKnowledgeRepository repo, ContentLocalizer localizer) { _repo = repo; _localizer = localizer; }

    /// <summary>Crop guide, optionally filtered by season (kharif, rabi, zaid).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Crop>>> GetAll([FromQuery] string? season, [FromQuery] string? lang, CancellationToken ct) =>
        Ok(await _localizer.CropsAsync(_repo.GetCrops(season), Languages.Normalize(lang), ct));

    [HttpGet("{id}")]
    public async Task<ActionResult<Crop>> Get(string id, [FromQuery] string? lang, CancellationToken ct)
    {
        var crop = _repo.GetCrop(id);
        if (crop is null) return NotFound();
        var localized = await _localizer.CropsAsync(new[] { crop }, Languages.Normalize(lang), ct);
        return localized[0];
    }
}

[ApiController]
[Route("api/helplines")]
public class HelplinesController : ControllerBase
{
    private readonly IKnowledgeRepository _repo;
    private readonly ContentLocalizer _localizer;
    public HelplinesController(IKnowledgeRepository repo, ContentLocalizer localizer) { _repo = repo; _localizer = localizer; }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Helpline>>> GetAll([FromQuery] string? lang, CancellationToken ct) =>
        Ok(await _localizer.HelplinesAsync(_repo.GetHelplines(), Languages.Normalize(lang), ct));
}

[ApiController]
[Route("api/mandi")]
public class MandiController : ControllerBase
{
    private readonly IMandiService _mandi;
    public MandiController(IMandiService mandi) => _mandi = mandi;

    /// <summary>Mandi prices (₹ per quintal). Filters use Agmarknet names, e.g. state=Uttar Pradesh, commodity=Wheat.</summary>
    [HttpGet("prices")]
    public async Task<ActionResult<MandiResult>> Prices(
        [FromQuery] string? state, [FromQuery] string? district, [FromQuery] string? commodity, CancellationToken ct) =>
        Ok(await _mandi.GetPricesAsync(state, district, commodity, ct));
}

[ApiController]
[Route("api/places")]
public class PlacesController : ControllerBase
{
    private readonly IPlacesService _places;
    public PlacesController(IPlacesService places) => _places = places;

    /// <summary>Tehsils / talukas / mandals of a district (LGD district code).</summary>
    [HttpGet("subdistricts")]
    public ActionResult<IReadOnlyList<Subdistrict>> Subdistricts([FromQuery] int district) => Ok(_places.Subdistricts(district));

    /// <summary>Villages of a tehsil (LGD state and sub-district codes). Names in English and, where LGD has it, the local script.</summary>
    [HttpGet("villages")]
    public ActionResult<IReadOnlyList<Village>> Villages([FromQuery] int state, [FromQuery] int subdistrict) =>
        Ok(_places.Villages(state, subdistrict));
}

[ApiController]
[Route("api/weather")]
public class WeatherController : ControllerBase
{
    private readonly IWeatherService _weather;
    private readonly IWeatherPointResolver _points;
    private readonly ContentLocalizer _localizer;
    public WeatherController(IWeatherService weather, IWeatherPointResolver points, ContentLocalizer localizer)
    {
        _weather = weather; _points = points; _localizer = localizer;
    }

    /// <summary>
    /// 7-day forecast with rain chance and farming alerts. lat/lon is the district centre; pass state, district,
    /// tehsil and village names to get the forecast for the farmer's own village or tehsil when it can be found.
    /// approx=true marks a new district whose centre is only rough.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<WeatherForecast>> Get(
        [FromQuery] double lat, [FromQuery] double lon, [FromQuery] string? lang,
        [FromQuery] string? state, [FromQuery] string? district, [FromQuery] string? tehsil, [FromQuery] string? village,
        [FromQuery] bool approx, CancellationToken ct)
    {
        if (lat is < 6 or > 38 || lon is < 68 or > 98)
            return BadRequest(new { error = "Location must be inside India." });

        var point = await _points.ResolveAsync(state, district, tehsil, village, lat, lon, approx, ct);
        var forecast = await _weather.GetForecastAsync(point.Latitude, point.Longitude, ct);
        if (forecast is null) return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Weather is unavailable right now." });

        forecast = forecast with { PlaceLevel = point.Level, PlaceName = point.Name };
        return await _localizer.WeatherAsync(forecast, Languages.Normalize(lang), ct);
    }
}

[ApiController]
[Route("api/calculators")]
public class CalculatorsController : ControllerBase
{
    private readonly ICalculatorService _calc;
    public CalculatorsController(ICalculatorService calc) => _calc = calc;

    [HttpPost("fertilizer")]
    public ActionResult<FertilizerResult> Fertilizer(FertilizerRequest request) => Ok(_calc.Fertilizer(request));

    [HttpPost("loan")]
    public ActionResult<LoanResult> Loan(LoanRequest request) => Ok(_calc.Loan(request));

    [HttpPost("profit")]
    public ActionResult<ProfitResult> Profit(ProfitRequest request) => Ok(_calc.Profit(request));
}

[ApiController]
[Route("api/advisory")]
public class AdvisoryController : ControllerBase
{
    private const int MaxImageBase64Length = 7_000_000; // about 5 MB of image

    private readonly IAdvisoryService _advisory;
    public AdvisoryController(IAdvisoryService advisory) => _advisory = advisory;

    /// <summary>Ask the AI Kisan Sahayak a question (any supported language), optionally with a crop photo.</summary>
    [HttpPost("ask")]
    [RequestSizeLimit(8_000_000)]
    public async Task<ActionResult<AdvisoryResponse>> Ask(AdvisoryRequest request, CancellationToken ct)
    {
        if (request.ImageBase64 is { Length: > MaxImageBase64Length })
            return BadRequest(new { error = "Image too large. Please use a photo under 5 MB." });

        return Ok(await _advisory.AskAsync(request, ct));
    }
}

[ApiController]
[Route("api/calendar")]
public class CalendarController : ControllerBase
{
    private readonly ICropPlanService _plans;
    private readonly IWeatherService _weather;
    private readonly IWeatherPointResolver _points;
    private readonly ContentLocalizer _localizer;
    public CalendarController(ICropPlanService plans, IWeatherService weather, IWeatherPointResolver points, ContentLocalizer localizer)
    {
        _plans = plans; _weather = weather; _points = points; _localizer = localizer;
    }

    /// <summary>Crops that have a full sowing-to-harvest calendar.</summary>
    [HttpGet("crops")]
    public ActionResult<IReadOnlyList<string>> Crops() => Ok(_plans.CropIds);

    /// <summary>
    /// What to sow in an empty field: crops whose sowing window is open now or opens within 30 days in the farmer's region
    /// (from state, and district for Bundelkhand), ordered by the field's water and soil
    /// (soil = black | mixed | loam | sandy | red). Crops that don't suit the region are left out.
    /// </summary>
    [HttpGet("suggest")]
    public async Task<ActionResult<SuggestResponse>> Suggest(
        [FromQuery] bool irrigated = true, [FromQuery] string? state = null, [FromQuery] string? district = null,
        [FromQuery] string? soil = null, [FromQuery] string? lang = null, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
        return Ok(await _localizer.SuggestionsAsync(_plans.Suggest(today, irrigated, state, district, soil), Languages.Normalize(lang), ct));
    }

    /// <summary>
    /// Day-by-day work for one field: preparation, sowing, urea/DAP/MOP for the field's area, watering,
    /// weeding, pest checks and harvest, dated from the sowing date (transplanting date for paddy).
    /// With lat/lon (and optionally place names, as for /api/weather) tasks in the next 7 days get a weather flag:
    /// "rain" (wait — rain coming), "water" (skip watering — good rain coming), "wind" (too windy to spray).
    /// soil (black | mixed | loam | sandy | red) adds soil notes to irrigation and urea tasks, and black soil drops the optional irrigations.
    /// The phone app turns this plan into morning and evening reminders.
    /// </summary>
    [HttpGet("plan")]
    public async Task<ActionResult<FieldPlan>> Plan(
        [FromQuery] string crop, [FromQuery] string sown, [FromQuery] double area = 1, [FromQuery] bool irrigated = true,
        [FromQuery] string? lang = null, [FromQuery] double? lat = null, [FromQuery] double? lon = null,
        [FromQuery] string? state = null, [FromQuery] string? district = null, [FromQuery] string? tehsil = null,
        [FromQuery] string? village = null, [FromQuery] bool approx = false, [FromQuery] string? soil = null,
        CancellationToken ct = default)
    {
        if (!DateOnly.TryParseExact(sown, "yyyy-MM-dd", out var sownOn))
            return BadRequest(new { error = "sown must be a date like 2026-11-15." });
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
        if (sownOn < today.AddDays(-400) || sownOn > today.AddDays(120))
            return BadRequest(new { error = "Sowing date must be within the last year or the next 4 months." });
        if (area is <= 0 or > 10000) return BadRequest(new { error = "Area must be between 0 and 10000 acres." });

        WeatherForecast? forecast = null;
        if (lat is >= 6 and <= 38 && lon is >= 68 and <= 98)
        {
            var point = await _points.ResolveAsync(state, district, tehsil, village, lat.Value, lon.Value, approx, ct);
            forecast = await _weather.GetForecastAsync(point.Latitude, point.Longitude, ct); // null = plan without weather flags
        }

        var plan = _plans.Build(crop, sownOn, area, irrigated, soil, forecast);
        if (plan is null) return NotFound(new { error = $"No crop calendar for '{crop}'." });
        return await _localizer.PlanAsync(plan, Languages.Normalize(lang), ct);
    }
}
