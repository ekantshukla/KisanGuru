using KisanGuru.Api.Data;
using Microsoft.AspNetCore.HttpOverrides;
using KisanGuru.Api.Options;
using KisanGuru.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Hosts like Render, Railway and Cloud Run tell the app which port to use in $PORT.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port)) builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Behind the host's HTTPS proxy: trust X-Forwarded-For / -Proto so links and logs show the real scheme and client.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.Configure<MandiOptions>(builder.Configuration.GetSection(MandiOptions.SectionName));
builder.Services.Configure<AdvisoryOptions>(builder.Configuration.GetSection(AdvisoryOptions.SectionName));
builder.Services.Configure<WeatherOptions>(builder.Configuration.GetSection(WeatherOptions.SectionName));

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IWeatherService, WeatherService>(c => c.Timeout = TimeSpan.FromSeconds(15));
builder.Services.AddHttpClient<IWeatherPointResolver, WeatherPointResolver>(c => c.Timeout = TimeSpan.FromSeconds(10));

// All-India tehsils and villages (LGD), built by tools/build_places.py
builder.Services.AddSingleton<IPlacesService, PlacesService>();

// Multilingual content: cached AI translation of schemes, crops, helplines and weather alerts
builder.Services.AddHttpClient<IContentTranslator, ContentTranslator>(c => c.Timeout = TimeSpan.FromSeconds(120));
builder.Services.AddScoped<ContentLocalizer>();

builder.Services.AddSingleton<IKnowledgeRepository, InMemoryKnowledgeRepository>();
builder.Services.AddSingleton<ICalculatorService, CalculatorService>();
builder.Services.AddSingleton<ICropPlanService, CropPlanService>();
builder.Services.AddHttpClient<IMandiService, MandiService>(c => c.Timeout = TimeSpan.FromSeconds(20));
builder.Services.AddHttpClient<IAdvisoryService, AdvisoryService>(c => c.Timeout = TimeSpan.FromSeconds(90));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // /openapi/v1.json
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "KisanGuru API v1"));
}

app.UseForwardedHeaders();
app.UseCors("web");

// The Angular site is built into wwwroot (see Dockerfile), so one app serves both the website and /api.
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", app = "KisanGuru" }));

// Angular routes (/khet, /mausam, …) load index.html; unknown /api paths still return 404.
app.MapFallback("/api/{**rest}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();
