using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace KisanGuru.Api.Services;

public record Subdistrict(int Code, string Name);
public record Village(int Code, string Name, string? Local);

public interface IPlacesService
{
    IReadOnlyList<Subdistrict> Subdistricts(int districtCode);
    IReadOnlyList<Village> Villages(int stateCode, int subdistrictCode);
}

/// <summary>
/// Tehsils/talukas/mandals and villages of all India from the Local Government Directory (LGD),
/// built by tools/build_places.py into App_Data/places. Tehsils (~7,000) are loaded once;
/// villages (~6.6 lakh) are loaded per state on first use and kept in memory for an hour.
/// </summary>
public class PlacesService : IPlacesService
{
    private readonly string _folder;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PlacesService> _logger;
    private readonly Lazy<Dictionary<int, IReadOnlyList<Subdistrict>>> _subdistricts;

    public PlacesService(IWebHostEnvironment env, IMemoryCache cache, ILogger<PlacesService> logger)
    {
        _folder = Path.Combine(env.ContentRootPath, "App_Data", "places");
        _cache = cache;
        _logger = logger;
        _subdistricts = new Lazy<Dictionary<int, IReadOnlyList<Subdistrict>>>(LoadSubdistricts);
    }

    public IReadOnlyList<Subdistrict> Subdistricts(int districtCode) =>
        _subdistricts.Value.TryGetValue(districtCode, out var list) ? list : Array.Empty<Subdistrict>();

    public IReadOnlyList<Village> Villages(int stateCode, int subdistrictCode)
    {
        var byTehsil = _cache.GetOrCreate($"villages:{stateCode}", entry =>
        {
            entry.SlidingExpiration = TimeSpan.FromHours(1);
            return LoadVillages(stateCode);
        })!;
        return byTehsil.TryGetValue(subdistrictCode, out var list) ? list : Array.Empty<Village>();
    }

    private Dictionary<int, IReadOnlyList<Subdistrict>> LoadSubdistricts()
    {
        var result = new Dictionary<int, IReadOnlyList<Subdistrict>>();
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllBytes(Path.Combine(_folder, "subdistricts.json")));
            foreach (var district in doc.RootElement.EnumerateObject())
            {
                result[int.Parse(district.Name)] = district.Value.EnumerateArray()
                    .Select(x => new Subdistrict(x[0].GetInt32(), x[1].GetString() ?? ""))
                    .ToList();
            }
        }
        catch (Exception ex) when (ex is IOException or JsonException or FormatException)
        {
            _logger.LogError(ex, "Could not load App_Data/places/subdistricts.json — run tools/build_places.py");
        }
        return result;
    }

    private Dictionary<int, IReadOnlyList<Village>> LoadVillages(int stateCode)
    {
        var result = new Dictionary<int, IReadOnlyList<Village>>();
        var path = Path.Combine(_folder, "villages", $"{stateCode}.json");
        if (!File.Exists(path)) return result;
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllBytes(path));
            foreach (var tehsil in doc.RootElement.EnumerateObject())
            {
                result[int.Parse(tehsil.Name)] = tehsil.Value.EnumerateArray()
                    .Select(x => new Village(x[0].GetInt32(), x[1].GetString() ?? "", x.GetArrayLength() > 2 ? x[2].GetString() : null))
                    .ToList();
            }
        }
        catch (Exception ex) when (ex is IOException or JsonException or FormatException)
        {
            _logger.LogError(ex, "Could not load villages for state {State}", stateCode);
        }
        return result;
    }
}
