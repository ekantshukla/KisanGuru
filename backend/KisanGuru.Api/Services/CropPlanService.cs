using System.Globalization;
using KisanGuru.Api.Data;
using KisanGuru.Api.Models;

namespace KisanGuru.Api.Services;

public interface ICropPlanService
{
    IReadOnlyList<string> CropIds { get; }

    /// <summary>Dated tasks for one field, from field preparation to harvest. Null if the crop has no calendar.</summary>
    FieldPlan? Build(string cropId, DateOnly sownOn, double areaAcres, bool irrigated, string? soil, WeatherForecast? forecast);

    /// <summary>
    /// Crops that can be sown now or within 30 days in the farmer's region (from state/district).
    /// Order: fits the field's water, fits the soil, open now, closes soonest.
    /// </summary>
    SuggestResponse Suggest(DateOnly today, bool irrigated, string? state, string? district, string? soil);
}

/// <summary>
/// Turns a crop calendar into a dated plan for the farmer's field: dates from the sowing date,
/// urea/DAP/MOP for the field's area (same formulas as the fertiliser calculator), rain-fed fields
/// without the irrigation steps, and weather flags for the next 7 days.
/// </summary>
public class CropPlanService : ICropPlanService
{
    private readonly IKnowledgeRepository _repo;
    private readonly ICalculatorService _calc;

    public CropPlanService(IKnowledgeRepository repo, ICalculatorService calc) { _repo = repo; _calc = calc; }

    public IReadOnlyList<string> CropIds { get; } = CropCalendars.All.Keys.ToList();

    // Weather rules for field work
    private const int RainChanceToWait = 60;   // %
    private const double RainMmToWait = 5;
    private const double RainMmSkipWater = 10;
    private const double WindKmhNoSpray = 20;

    public FieldPlan? Build(string cropId, DateOnly sownOn, double areaAcres, bool irrigated, string? soil, WeatherForecast? forecast)
    {
        soil = AgroZones.NormalizeSoil(soil);
        var soilInfo = soil is null ? null : AgroZones.SoilData[soil];
        if (!CropCalendars.All.TryGetValue(cropId, out var cal)) return null;
        var crop = _repo.GetCrop(cropId);
        if (crop is null) return null;

        var area = Math.Clamp(areaAcres, 0.01, 10000);
        var fert = _calc.Fertilizer(new FertilizerRequest(area, crop.NpkPerAcre.N, crop.NpkPerAcre.P, crop.NpkPerAcre.K));

        // Paddy's crop duration includes the ~25 days in the nursery; day 0 here is transplanting.
        var offset = cal.DayZeroIsTransplanting ? 25 : 0;
        var minDays = crop.DurationMinDays - offset;
        var maxDays = crop.DurationMaxDays - offset;

        var weatherByDate = (forecast?.Days ?? Array.Empty<WeatherDay>()).ToDictionary(d => d.Date);
        string? Flag(string kind, DateOnly from, DateOnly to)
        {
            if (weatherByDate.Count == 0) return null;
            for (var d = from; d <= to; d = d.AddDays(1))
            {
                if (!weatherByDate.TryGetValue(Iso(d), out var w)) continue;
                weatherByDate.TryGetValue(Iso(d.AddDays(1)), out var next);
                var rainSoon = w.RainChance >= RainChanceToWait || w.RainMm >= RainMmToWait
                               || (next is not null && (next.RainChance >= RainChanceToWait || next.RainMm >= RainMmToWait));
                switch (kind)
                {
                    case TaskKind.Protection or TaskKind.Weeding or TaskKind.Fertilizer when rainSoon:
                        return "rain";
                    case TaskKind.Protection or TaskKind.Weeding when w.WindMax >= WindKmhNoSpray:
                        return "wind";
                    case TaskKind.Irrigation when w.RainMm >= RainMmSkipWater || (next?.RainMm ?? 0) >= RainMmSkipWater:
                        return "water";
                }
            }
            return null;
        }

        var tasks = new List<PlanTask>();
        foreach (var s in cal.Steps)
        {
            if (s.IrrigatedOnly && !irrigated) continue;
            if (s.Optional && soilInfo?.SkipOptionalIrrigations == true) continue;   // black soil keeps moisture
            var start = sownOn.AddDays(s.From);
            var end = s.To > s.From ? sownOn.AddDays(s.To) : (DateOnly?)null;
            if (s.Kind == TaskKind.Harvest) end = sownOn.AddDays(maxDays);
            var harvestStart = s.Kind == TaskKind.Harvest ? sownOn.AddDays(minDays) : start;

            TaskAmounts? amounts = null;
            if (s.UreaShare > 0 || s.Basal)
            {
                double? urea = s.UreaShare > 0 && fert.UreaKg > 0 ? Math.Round(fert.UreaKg * s.UreaShare, 1) : null;
                double? dap = s.Basal && fert.DapKg > 0 ? fert.DapKg : null;
                double? mop = s.Basal && fert.MopKg > 0 ? fert.MopKg : null;
                if (urea is not null || dap is not null || mop is not null) amounts = new TaskAmounts(urea, dap, mop);
            }

            tasks.Add(new PlanTask(
                s.Id, s.Kind, Iso(harvestStart), end is null ? null : Iso(end.Value), s.Kind == TaskKind.Harvest ? minDays : s.From,
                s.Title, s.Details, amounts, Flag(s.Kind, harvestStart, end ?? harvestStart),
                soilInfo is null ? null
                    : s.Kind == TaskKind.Irrigation ? soilInfo.Irrigation
                    : s.Kind == TaskKind.Fertilizer && s.UreaShare > 0 ? soilInfo.Fertilizer
                    : null));
        }

        return new FieldPlan(
            cropId, crop.Name, Iso(sownOn), cal.DayZeroIsTransplanting,
            Iso(sownOn.AddDays(minDays)), Iso(sownOn.AddDays(maxDays)), maxDays,
            cal.Stages.Select(g => new PlanStage(g.From, g.To, g.Name)).ToList(),
            tasks.OrderBy(t => t.Date, StringComparer.Ordinal).ToList(),
            soil, soilInfo?.Name, soilInfo?.Tip);
    }

    public SuggestResponse Suggest(DateOnly today, bool irrigated, string? state, string? district, string? soil)
    {
        var known = AgroZones.RegionOf(state, district);
        var region = known ?? AgroZones.North;
        soil = AgroZones.NormalizeSoil(soil);
        var list = new List<CropSuggestion>();
        foreach (var cropId in CropIds)
        {
            var crop = _repo.GetCrop(cropId);
            if (crop is null) continue;
            var water = AgroZones.Water.GetValueOrDefault(cropId, "medium");
            foreach (var w in AgroZones.WindowsFor(cropId, region))
            {
                // This season's window, or the next one if this one is over (windows may cross the new year)
                foreach (var year in new[] { today.Year - 1, today.Year, today.Year + 1 })
                {
                    var from = new DateOnly(year, w.FromMonth, w.FromDay);
                    var to = new DateOnly(w.ToMonth < w.FromMonth ? year + 1 : year, w.ToMonth, w.ToDay);
                    if (to < today) continue;
                    var status = from <= today ? "now" : from <= today.AddDays(30) ? "soon" : null;
                    if (status is not null)
                        list.Add(new CropSuggestion(cropId, crop.Name, w.Season, Iso(from), Iso(to), status, water,
                            w.IrrigatedOnly || water == "high", crop.DurationMinDays, crop.DurationMaxDays, AgroZones.FitOf(cropId, soil)));
                    break;
                }
            }
        }
        var items = list
            .OrderBy(s => !irrigated && s.NeedsIrrigation)                 // fits the field's water first
            .ThenBy(s => s.SoilFit == "good" ? 0 : s.SoilFit == "ok" ? 1 : 2) // then fits the soil
            .ThenBy(s => s.Status == "now" ? 0 : 1)
            .ThenBy(s => s.SowTo, StringComparer.Ordinal)
            .ToList();
        return new SuggestResponse(region, AgroZones.RegionNames[region], AgroZones.RegionTips.GetValueOrDefault(region), known is not null, items);
    }

    private static string Iso(DateOnly d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
