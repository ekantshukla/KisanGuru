namespace KisanGuru.Api.Models;

/// <summary>Kinds of field work. The app shows an icon per kind and uses it for weather checks.</summary>
public static class TaskKind
{
    public const string Prep = "prep";
    public const string Sowing = "sowing";
    public const string Fertilizer = "fertilizer";
    public const string Irrigation = "irrigation";
    public const string Weeding = "weeding";
    public const string Protection = "protection";   // spraying / pest & disease control
    public const string Scouting = "scouting";       // look for a pest or problem, act only if seen
    public const string Harvest = "harvest";
}

/// <summary>
/// One step of a crop calendar, in days after sowing (or after transplanting for paddy).
/// UreaShare is the part of the crop's total urea given at this step; Basal steps also carry the DAP and MOP.
/// IrrigatedOnly steps are dropped for rain-fed fields.
/// </summary>
public record CalendarStep(
    string Id,
    int From,
    int To,
    string Kind,
    LocalizedText Title,
    LocalizedText Details,
    double UreaShare = 0,
    bool Basal = false,
    bool IrrigatedOnly = false,
    bool Optional = false);   // irrigation that heavy (black) soils can skip

public record CalendarStage(int From, int To, LocalizedText Name);

public record CropCalendar(
    string CropId,
    bool DayZeroIsTransplanting,
    IReadOnlyList<CalendarStage> Stages,
    IReadOnlyList<CalendarStep> Steps);

/// <summary>Fertiliser for this step, for the farmer's whole field (kg).</summary>
public record TaskAmounts(double? UreaKg, double? DapKg, double? MopKg);

/// <summary>
/// A dated task. Weather is set for tasks in the next 7 days when the forecast says to wait:
/// "rain" (rain coming — don't spray or put urea), "water" (good rain coming — skip watering), "wind" (too windy to spray).
/// </summary>
public record PlanTask(
    string Id,
    string Kind,
    string Date,
    string? EndDate,
    int Day,
    LocalizedText Title,
    LocalizedText Details,
    TaskAmounts? Amounts,
    string? Weather,
    LocalizedText? SoilNote = null);

public record PlanStage(int From, int To, LocalizedText Name);

public record FieldPlan(
    string CropId,
    LocalizedText CropName,
    string SownOn,
    bool DayZeroIsTransplanting,
    string HarvestFrom,
    string HarvestTo,
    int DurationDays,
    IReadOnlyList<PlanStage> Stages,
    IReadOnlyList<PlanTask> Tasks,
    string? Soil = null,
    LocalizedText? SoilName = null,
    LocalizedText? SoilTip = null);

/// <summary>When a crop can be sown (month/day, every year). IrrigatedOnly: this window needs irrigation (e.g. summer moong).</summary>
public record SowWindow(int FromMonth, int FromDay, int ToMonth, int ToDay, string Season, bool IrrigatedOnly = false);

/// <summary>
/// A crop the farmer can sow now (or soon) in an empty field, for the farmer's region and the field's soil. Status "now" = inside the sowing window,
/// "soon" = the window opens within 30 days. NeedsIrrigation = only worth it with a water source.
/// </summary>
public record CropSuggestion(
    string CropId,
    LocalizedText Name,
    string Season,
    string SowFrom,
    string SowTo,
    string Status,
    string Water,            // "low" | "medium" | "high"
    bool NeedsIrrigation,
    int DurationMinDays,
    int DurationMaxDays,
    string SoilFit = "ok");    // "good" | "ok" | "poor" for the field's soil

/// <summary>Sowing suggestions for one place and soil, with the region they were worked out for.</summary>
public record SuggestResponse(
    string Region,
    LocalizedText RegionName,
    LocalizedText? RegionTip,
    bool RegionKnown,
    IReadOnlyList<CropSuggestion> Items);
