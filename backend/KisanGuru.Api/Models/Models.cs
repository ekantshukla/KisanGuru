using System.ComponentModel.DataAnnotations;

namespace KisanGuru.Api.Models;

/// <summary>
/// Text written by hand in Hindi and English. For the other Indian languages the API fills
/// <see cref="Local"/> with a cached machine translation of the English text.
/// </summary>
public record LocalizedText(string Hi, string En, string? Local = null);

public record Scheme(
    string Id,
    string Category,
    LocalizedText Name,
    LocalizedText Summary,
    IReadOnlyList<LocalizedText> Benefits,
    IReadOnlyList<LocalizedText> HowToApply,
    string Website,
    string? Helpline);

public record NpkRecommendation(double N, double P, double K);

public record Crop(
    string Id,
    string Season,               // "kharif" | "rabi" | "zaid"
    LocalizedText Name,
    LocalizedText SowingTime,
    int DurationMinDays,
    int DurationMaxDays,
    LocalizedText SeedRate,
    LocalizedText Irrigation,
    NpkRecommendation NpkPerAcre, // kg of N, P2O5, K2O per acre (general guide)
    IReadOnlyList<LocalizedText> Tips);

public record Helpline(string Id, LocalizedText Name, string Number, LocalizedText Purpose);

public record MandiPrice(
    string State,
    string District,
    string Market,
    string Commodity,
    string Variety,
    string ArrivalDate,
    decimal MinPrice,
    decimal MaxPrice,
    decimal ModalPrice);

public record MandiResult(bool IsSample, string Source, IReadOnlyList<MandiPrice> Prices);

// ---------- Calculators ----------

public record FertilizerRequest(
    [Range(0.01, 10000)] double AreaAcres,
    [Range(0, 500)] double N,
    [Range(0, 500)] double P,
    [Range(0, 500)] double K);

public record FertilizerResult(
    double DapKg, double UreaKg, double MopKg,
    int DapBags, int UreaBags, int MopBags,
    string Note);

public record LoanRequest(
    [Range(1, 100000000)] decimal Principal,
    [Range(1, 120)] int Months,
    [Range(0, 50)] decimal AnnualRatePercent,
    bool PromptRepayment);

public record LoanResult(decimal EffectiveRatePercent, decimal Interest, decimal TotalRepayment);

public record ProfitRequest(
    [Range(0.01, 10000)] double AreaAcres,
    [Range(0, 1000)] double YieldQuintalPerAcre,
    [Range(0, 1000000)] decimal PricePerQuintal,
    [Range(0, 10000000)] decimal CostPerAcre);

public record ProfitResult(
    double TotalYieldQuintal,
    decimal GrossIncome,
    decimal TotalCost,
    decimal NetProfit,
    decimal ProfitPerAcre);

// ---------- AI advisory ----------

public record AdvisoryRequest(
    [Required, StringLength(2000, MinimumLength = 2)] string Question,
    string Language,          // "hi" | "en"
    string? ImageBase64,      // optional crop photo, base64 without the data: prefix
    string? ImageMediaType,   // image/jpeg | image/png | image/webp
    string? Location = null,  // e.g. "village Ahroli, tehsil Moth, district Jhansi, Uttar Pradesh"
    IReadOnlyList<ChatTurn>? History = null); // earlier turns of this conversation (the app sends the last 8)

/// <summary>One earlier message in the chat: role "user" or "assistant".</summary>
public record ChatTurn(string Role, string Text);

public record AdvisoryResponse(string Answer, bool AiEnabled);
