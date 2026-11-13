using KisanGuru.Api.Models;

namespace KisanGuru.Api.Services;

public interface ICalculatorService
{
    FertilizerResult Fertilizer(FertilizerRequest request);
    LoanResult Loan(LoanRequest request);
    ProfitResult Profit(ProfitRequest request);
}

public class CalculatorService : ICalculatorService
{
    // Nutrient content of common fertilisers
    private const double DapN = 0.18;   // DAP 18-46-0
    private const double DapP = 0.46;
    private const double UreaN = 0.46;  // Urea 46% N
    private const double MopK = 0.60;   // MOP 60% K2O

    private const double UreaBagKg = 45;
    private const double DapBagKg = 50;
    private const double MopBagKg = 50;

    /// <summary>
    /// Converts an N-P-K recommendation (kg per acre) into DAP, urea and MOP for the whole field.
    /// Phosphorus comes from DAP first; the nitrogen DAP supplies is subtracted before urea is worked out.
    /// </summary>
    public FertilizerResult Fertilizer(FertilizerRequest r)
    {
        var dapPerAcre = r.P / DapP;
        var nFromDap = dapPerAcre * DapN;
        var ureaPerAcre = Math.Max(0, r.N - nFromDap) / UreaN;
        var mopPerAcre = r.K / MopK;

        var dap = Math.Round(dapPerAcre * r.AreaAcres, 1);
        var urea = Math.Round(ureaPerAcre * r.AreaAcres, 1);
        var mop = Math.Round(mopPerAcre * r.AreaAcres, 1);

        return new FertilizerResult(
            dap, urea, mop,
            (int)Math.Ceiling(dap / DapBagKg),
            (int)Math.Ceiling(urea / UreaBagKg),
            (int)Math.Ceiling(mop / MopBagKg),
            "Bags: DAP 50 kg, Urea 45 kg, MOP 50 kg. Follow your Soil Health Card if you have one.");
    }

    /// <summary>
    /// Simple-interest estimate for a short-term KCC crop loan.
    /// Prompt repayment takes 3 percentage points off the rate (7% → 4%).
    /// </summary>
    public LoanResult Loan(LoanRequest r)
    {
        var rate = r.PromptRepayment ? Math.Max(0, r.AnnualRatePercent - 3m) : r.AnnualRatePercent;
        var interest = Math.Round(r.Principal * rate / 100m * r.Months / 12m, 2);
        return new LoanResult(rate, interest, r.Principal + interest);
    }

    public ProfitResult Profit(ProfitRequest r)
    {
        var totalYield = Math.Round(r.AreaAcres * r.YieldQuintalPerAcre, 2);
        var gross = Math.Round((decimal)totalYield * r.PricePerQuintal, 2);
        var cost = Math.Round((decimal)r.AreaAcres * r.CostPerAcre, 2);
        var net = gross - cost;
        var perAcre = Math.Round(net / (decimal)r.AreaAcres, 2);
        return new ProfitResult(totalYield, gross, cost, net, perAcre);
    }
}
