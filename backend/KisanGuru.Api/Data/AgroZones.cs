using KisanGuru.Api.Models;

namespace KisanGuru.Api.Data;

/// <summary>
/// What changes with the place and the soil:
/// - Region: the farmer's state (and district for Bundelkhand) decides the sowing windows and which crops are suggested at all.
/// - Soil: each field's soil decides how often to water, how to split urea, extra care, and how well each crop fits.
/// Sowing windows are general guidance from state agriculture university packages of practice; the app asks
/// farmers to confirm local timing with their KVK.
/// </summary>
public static class AgroZones
{
    private static LocalizedText T(string hi, string en) => new(hi, en);
    private static SowWindow W(int fm, int fd, int tm, int td, string season, bool irr = false) => new(fm, fd, tm, td, season, irr);

    // ---------------- Regions ----------------
    public const string North = "north", Central = "central", Bundelkhand = "bundelkhand", West = "west", South = "south", East = "east", Hills = "hills";

    public static readonly IReadOnlyDictionary<string, LocalizedText> RegionNames = new Dictionary<string, LocalizedText>
    {
        [North] = T("उत्तर भारत के मैदान", "North Indian plains"),
        [Central] = T("मध्य भारत", "Central India"),
        [Bundelkhand] = T("बुंदेलखंड", "Bundelkhand"),
        [West] = T("पश्चिम भारत", "Western India"),
        [South] = T("दक्षिण भारत", "South India"),
        [East] = T("पूर्व और पूर्वोत्तर भारत", "Eastern and North-East India"),
        [Hills] = T("पहाड़ी क्षेत्र", "Hill region")
    };

    private static readonly Dictionary<string, string> StateRegion = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Punjab"] = North, ["Haryana"] = North, ["Delhi"] = North, ["Chandigarh"] = North, ["Uttar Pradesh"] = North,
        ["Bihar"] = North, ["Rajasthan"] = North,
        ["Madhya Pradesh"] = Central, ["Chhattisgarh"] = Central,
        ["Maharashtra"] = West, ["Gujarat"] = West, ["Goa"] = West, ["Dadra & Nagar Haveli and Daman & Diu"] = West,
        ["Karnataka"] = South, ["Andhra Pradesh"] = South, ["Telangana"] = South, ["Tamil Nadu"] = South, ["Kerala"] = South,
        ["Puducherry"] = South, ["Lakshadweep"] = South, ["Andaman & Nicobar Islands"] = South,
        ["West Bengal"] = East, ["Odisha"] = East, ["Jharkhand"] = East, ["Assam"] = East, ["Arunachal Pradesh"] = East,
        ["Manipur"] = East, ["Meghalaya"] = East, ["Mizoram"] = East, ["Nagaland"] = East, ["Tripura"] = East, ["Sikkim"] = East,
        ["Himachal Pradesh"] = Hills, ["Uttarakhand"] = Hills, ["Jammu & Kashmir"] = Hills, ["Ladakh"] = Hills
    };

    /// <summary>Bundelkhand districts of UP and MP: dry, mostly rain-fed, its own soils (mar, kabar, padua, rakar).</summary>
    private static readonly HashSet<string> BundelkhandDistricts = new(StringComparer.OrdinalIgnoreCase)
    {
        "Jhansi", "Lalitpur", "Jalaun", "Hamirpur", "Mahoba", "Banda", "Chitrakoot",
        "Sagar", "Chhatarpur", "Tikamgarh", "Niwari", "Damoh", "Panna", "Datia"
    };

    /// <summary>Region for a state and district; null when the place is unknown (the app then uses North as before).</summary>
    public static string? RegionOf(string? state, string? district)
    {
        if (!string.IsNullOrWhiteSpace(district) && BundelkhandDistricts.Contains(district.Trim())
            && (state is null || state.Contains("Pradesh", StringComparison.OrdinalIgnoreCase)))
            return Bundelkhand;
        return state is not null && StateRegion.TryGetValue(state.Trim(), out var r) ? r : null;
    }

    /// <summary>A note for the whole region, shown above the suggestions.</summary>
    public static readonly IReadOnlyDictionary<string, LocalizedText> RegionTips = new Dictionary<string, LocalizedText>
    {
        [Bundelkhand] = T("बुंदेलखंड में बारिश कम और अनिश्चित होती है। कम पानी वाली फसलें (चना, मसूर, सरसों, मूंग) ज़्यादा सुरक्षित हैं। बारिश का पानी खेत में रोकने के लिए मेड़बंदी करें।",
                          "Rain in Bundelkhand is low and uncertain. Low-water crops (chana, masoor, mustard, moong) are safer. Build field bunds to hold rain water."),
        [South] = T("दक्षिण भारत में मौसम अलग होते हैं (खरीफ, रबी और गर्मी)। सही समय के लिए अपने KVK से पूछें।",
                    "South India has its own seasons (kharif, rabi and summer). Ask your KVK for exact timing."),
        [East] = T("पूर्वी भारत में धान के बाद बची नमी में मसूर, चना या सरसों बो सकते हैं।",
                   "In eastern India, masoor, chana or mustard can be sown in the moisture left after paddy."),
        [Hills] = T("पहाड़ों में ऊंचाई के हिसाब से समय बदलता है — ऊंचे गांवों में बुवाई जल्दी करें।",
                    "In the hills, timing depends on height — sow earlier in higher villages.")
    };

    /// <summary>
    /// Sowing windows (transplanting for paddy) by crop and region. A crop with no entry for a region is not suggested there.
    /// Bundelkhand uses Central unless it has its own entry.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, SowWindow[]>> Windows =
        new Dictionary<string, IReadOnlyDictionary<string, SowWindow[]>>
        {
            ["wheat"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(11, 1, 12, 10, "rabi", true) },
                [Central] = new[] { W(10, 25, 11, 30, "rabi", true) },
                [West] = new[] { W(11, 1, 11, 30, "rabi", true) },
                [East] = new[] { W(11, 10, 12, 15, "rabi", true) },
                [Hills] = new[] { W(10, 15, 11, 15, "rabi", true) }
            },
            ["paddy"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(6, 15, 7, 31, "kharif", true) },
                [Central] = new[] { W(6, 25, 7, 31, "kharif", true) },
                [West] = new[] { W(7, 1, 8, 5, "kharif", true) },
                [South] = new[] { W(6, 15, 8, 31, "kharif", true), W(11, 1, 1, 15, "rabi", true) },
                [East] = new[] { W(7, 1, 8, 15, "kharif"), W(1, 1, 2, 15, "rabi", true) },
                [Hills] = new[] { W(6, 1, 7, 15, "kharif", true) }
            },
            ["chana"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(10, 10, 11, 15, "rabi") },
                [Central] = new[] { W(10, 15, 11, 15, "rabi") },
                [West] = new[] { W(10, 15, 11, 15, "rabi") },
                [South] = new[] { W(10, 1, 11, 15, "rabi") },
                [East] = new[] { W(10, 25, 11, 30, "rabi") },
                [Hills] = new[] { W(10, 1, 10, 31, "rabi") }
            },
            ["mustard"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(10, 1, 11, 5, "rabi") },
                [Central] = new[] { W(10, 1, 10, 31, "rabi") },
                [West] = new[] { W(10, 1, 11, 10, "rabi") },
                [East] = new[] { W(10, 15, 11, 20, "rabi") },
                [Hills] = new[] { W(9, 25, 10, 25, "rabi") }
            },
            ["soybean"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(6, 20, 7, 15, "kharif") },
                [Central] = new[] { W(6, 15, 7, 10, "kharif") },
                [West] = new[] { W(6, 15, 7, 15, "kharif") },
                [South] = new[] { W(6, 15, 7, 15, "kharif") },
                [Hills] = new[] { W(6, 1, 6, 30, "kharif") }
            },
            ["maize"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(6, 20, 7, 31, "kharif"), W(2, 1, 3, 15, "zaid", true) },
                [Central] = new[] { W(6, 20, 7, 20, "kharif") },
                [West] = new[] { W(6, 15, 7, 15, "kharif") },
                [South] = new[] { W(6, 15, 7, 31, "kharif"), W(10, 1, 11, 15, "rabi", true) },
                [East] = new[] { W(6, 15, 7, 31, "kharif"), W(10, 15, 11, 30, "rabi", true) },
                [Hills] = new[] { W(5, 15, 6, 30, "kharif") }
            },
            ["masoor"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(10, 15, 11, 25, "rabi") },
                [Central] = new[] { W(10, 15, 11, 15, "rabi") },
                [East] = new[] { W(10, 20, 11, 30, "rabi") },
                [Hills] = new[] { W(10, 1, 11, 10, "rabi") }
            },
            ["moong"] = new Dictionary<string, SowWindow[]>
            {
                [North] = new[] { W(3, 1, 4, 15, "zaid", true), W(7, 1, 7, 31, "kharif") },
                [Central] = new[] { W(3, 1, 4, 10, "zaid", true), W(6, 25, 7, 25, "kharif") },
                [West] = new[] { W(2, 15, 3, 31, "zaid", true), W(6, 15, 7, 15, "kharif") },
                [South] = new[] { W(6, 15, 7, 31, "kharif"), W(11, 15, 1, 15, "rabi") },
                [East] = new[] { W(3, 1, 4, 10, "zaid", true), W(7, 1, 7, 31, "kharif") },
                [Hills] = new[] { W(6, 1, 6, 30, "kharif") }
            }
        };

    public static SowWindow[] WindowsFor(string cropId, string region)
    {
        if (!Windows.TryGetValue(cropId, out var byRegion)) return Array.Empty<SowWindow>();
        if (byRegion.TryGetValue(region, out var w)) return w;
        return region == Bundelkhand && byRegion.TryGetValue(Central, out var c) ? c : Array.Empty<SowWindow>();
    }

    /// <summary>How much water each crop needs: "low" | "medium" | "high".</summary>
    public static readonly IReadOnlyDictionary<string, string> Water = new Dictionary<string, string>
    {
        ["wheat"] = "medium", ["paddy"] = "high", ["chana"] = "low", ["mustard"] = "low",
        ["soybean"] = "low", ["maize"] = "medium", ["masoor"] = "low", ["moong"] = "low"
    };

    // ---------------- Soils ----------------
    public const string Black = "black", Mixed = "mixed", Loam = "loam", Sandy = "sandy", Red = "red";
    public static readonly string[] Soils = { Black, Mixed, Loam, Sandy, Red };

    public record SoilInfo(
        LocalizedText Name,
        LocalizedText Tip,            // shown on the field
        LocalizedText Irrigation,     // added to every irrigation task
        LocalizedText? Fertilizer,    // added to every urea task
        bool SkipOptionalIrrigations); // heavy soils keep moisture: the optional irrigations are dropped

    public static readonly IReadOnlyDictionary<string, SoilInfo> SoilData = new Dictionary<string, SoilInfo>
    {
        [Black] = new(T("काली मिट्टी (मार / भारी)", "Black soil (mar / heavy)"),
            T("काली मिट्टी देर तक नमी रखती है, इसलिए सिंचाई कम लगती है। ज़्यादा पानी से जड़ें सड़ती हैं — खेत में पानी रुकने न दें, बड़ी दरारें पड़ने से पहले सिंचाई करें।",
              "Black soil holds moisture for long, so it needs fewer irrigations. Too much water rots the roots — do not let water stand, and irrigate before wide cracks open."),
            T("काली मिट्टी: बड़ी दरारें पड़ने से पहले पानी दें, हल्की सिंचाई काफ़ी है, पानी खड़ा न रहे।",
              "Black soil: water before wide cracks open; a light irrigation is enough; no standing water."),
            null, true),
        [Mixed] = new(T("काबर / मिली-जुली (काली और पीली)", "Kabar / mixed (black and yellow)"),
            T("मिली-जुली मिट्टी में नमी ठीक रहती है। ज़्यादातर फसलें अच्छी होती हैं। सूखने पर यह सख्त हो जाती है, इसलिए सही नमी पर ही जुताई करें।",
              "Mixed soil holds moisture well and suits most crops. It turns hard when dry, so plough only at the right moisture."),
            T("काबर मिट्टी: ऊपर की मिट्टी सूखकर सख्त होने लगे तब पानी दें।", "Mixed soil: water when the top soil starts drying hard."),
            null, false),
        [Loam] = new(T("पीली / दोमट (पड़ुआ)", "Yellow / loam (padua)"),
            T("दोमट मिट्टी सबसे संतुलित है — पानी और खाद दोनों ठीक रोकती है। कैलेंडर की सिंचाई जैसी है वैसी दें।",
              "Loam is the most balanced — it holds water and fertiliser well. Follow the irrigations in the calendar as they are."),
            T("दोमट मिट्टी: कैलेंडर के हिसाब से सामान्य सिंचाई।", "Loam: normal irrigation as per the calendar."),
            null, false),
        [Sandy] = new(T("रेतीली / बलुई (हल्की)", "Sandy (light)"),
            T("रेतीली मिट्टी पानी और खाद जल्दी नीचे बहा देती है। पानी हल्का और जल्दी-जल्दी दें, यूरिया थोड़ा-थोड़ा कई बार में डालें, गोबर खाद ज़्यादा डालें।",
              "Sandy soil lets water and fertiliser drain away fast. Water lightly and often, give urea in small doses several times, and add more farmyard manure."),
            T("रेतीली मिट्टी: हल्का पानी दें, और ज़रूरत हो तो 8–10 दिन बाद फिर दें।", "Sandy soil: give light water, and again after 8–10 days if needed."),
            T("रेतीली मिट्टी: यूरिया एक साथ न डालें — इसे दो हिस्सों में, 7–10 दिन के अंतर पर डालें।", "Sandy soil: do not put all the urea at once — split it into two parts, 7–10 days apart."),
            false),
        [Red] = new(T("लाल / कंकरीली (राकड़)", "Red / stony (rakar)"),
            T("लाल और कंकरीली मिट्टी उथली होती है और कम नमी रखती है। कम पानी वाली फसलें लें, गोबर खाद और मल्च (भूसा/पत्ती) से नमी बचाएं।",
              "Red and stony soil is shallow and holds little moisture. Grow low-water crops, and save moisture with farmyard manure and mulch (straw or leaves)."),
            T("लाल/कंकरीली मिट्टी: हल्का पानी दें, नमी बचाने के लिए भूसा या पत्तियां बिछाएं।", "Red/stony soil: give light water; spread straw or leaves to keep moisture."),
            T("लाल मिट्टी: यूरिया डालने से पहले नमी ज़रूर हो।", "Red soil: make sure the soil is moist before putting urea."),
            false)
    };

    /// <summary>How well a crop fits a soil: "good" | "ok" | "poor".</summary>
    public static readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> SoilFit =
        new Dictionary<string, IReadOnlyDictionary<string, string>>
        {
            ["wheat"] = Fit(good: new[] { Black, Mixed, Loam }, ok: new[] { Sandy }, poor: new[] { Red }),
            ["paddy"] = Fit(good: new[] { Black, Mixed, Loam }, ok: Array.Empty<string>(), poor: new[] { Sandy, Red }),
            ["chana"] = Fit(good: new[] { Black, Mixed, Loam }, ok: new[] { Sandy, Red }, poor: Array.Empty<string>()),
            ["mustard"] = Fit(good: new[] { Mixed, Loam, Sandy }, ok: new[] { Black, Red }, poor: Array.Empty<string>()),
            ["soybean"] = Fit(good: new[] { Black, Mixed, Loam }, ok: new[] { Red }, poor: new[] { Sandy }),
            ["maize"] = Fit(good: new[] { Mixed, Loam }, ok: new[] { Black, Sandy, Red }, poor: Array.Empty<string>()),
            ["masoor"] = Fit(good: new[] { Black, Mixed, Loam }, ok: new[] { Sandy, Red }, poor: Array.Empty<string>()),
            ["moong"] = Fit(good: new[] { Mixed, Loam, Sandy, Red }, ok: new[] { Black }, poor: Array.Empty<string>())
        };

    private static IReadOnlyDictionary<string, string> Fit(string[] good, string[] ok, string[] poor) =>
        good.Select(s => (s, "good")).Concat(ok.Select(s => (s, "ok"))).Concat(poor.Select(s => (s, "poor")))
            .ToDictionary(x => x.s, x => x.Item2);

    public static string FitOf(string cropId, string? soil) =>
        soil is not null && SoilFit.TryGetValue(cropId, out var f) && f.TryGetValue(soil, out var v) ? v : "ok";

    public static string? NormalizeSoil(string? soil) =>
        soil is not null && Soils.Contains(soil.Trim().ToLowerInvariant()) ? soil.Trim().ToLowerInvariant() : null;
}
