using KisanGuru.Api.Models;

namespace KisanGuru.Api.Data;

/// <summary>
/// Read access to schemes, crops and helplines. Swap the in-memory version for an
/// EF Core / SQL Server one later without touching the controllers.
/// </summary>
public interface IKnowledgeRepository
{
    IReadOnlyList<Scheme> GetSchemes(string? category = null);
    Scheme? GetScheme(string id);
    IReadOnlyList<Crop> GetCrops(string? season = null);
    Crop? GetCrop(string id);
    IReadOnlyList<Helpline> GetHelplines();
}

public class InMemoryKnowledgeRepository : IKnowledgeRepository
{
    public IReadOnlyList<Scheme> GetSchemes(string? category = null) =>
        string.IsNullOrWhiteSpace(category)
            ? SeedData.Schemes
            : SeedData.Schemes.Where(s => s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

    public Scheme? GetScheme(string id) =>
        SeedData.Schemes.FirstOrDefault(s => s.Id.Equals(id, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyList<Crop> GetCrops(string? season = null) =>
        string.IsNullOrWhiteSpace(season)
            ? SeedData.Crops
            : SeedData.Crops.Where(c => c.Season.Equals(season, StringComparison.OrdinalIgnoreCase)).ToList();

    public Crop? GetCrop(string id) =>
        SeedData.Crops.FirstOrDefault(c => c.Id.Equals(id, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyList<Helpline> GetHelplines() => SeedData.Helplines;
}
