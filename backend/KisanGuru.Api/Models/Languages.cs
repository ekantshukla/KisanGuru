namespace KisanGuru.Api.Models;

/// <summary>Languages the site supports (same list as the Angular app's core/languages.ts).</summary>
public static class Languages
{
    public static readonly IReadOnlyDictionary<string, string> EnglishNames = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["hi"] = "Hindi",
        ["en"] = "English",
        ["bn"] = "Bengali",
        ["mr"] = "Marathi",
        ["te"] = "Telugu",
        ["ta"] = "Tamil",
        ["gu"] = "Gujarati",
        ["kn"] = "Kannada",
        ["ml"] = "Malayalam",
        ["or"] = "Odia",
        ["pa"] = "Punjabi",
        ["as"] = "Assamese"
    };

    /// <summary>Normalises a language code; unknown codes become Hindi.</summary>
    public static string Normalize(string? code) =>
        code is not null && EnglishNames.ContainsKey(code) ? code.ToLowerInvariant() : "hi";

    /// <summary>Hindi and English are hand-written; every other language needs translation.</summary>
    public static bool NeedsTranslation(string code) => code is not ("hi" or "en");

    public static string NameOf(string code) => EnglishNames.TryGetValue(code, out var n) ? n : "Hindi";
}
