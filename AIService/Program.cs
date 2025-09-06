using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AIService.Services;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// REST client for SubscriptionService
builder.Services.AddHttpClient("Subscription", (sp, http) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var baseUrl = config["SubscriptionService:BaseUrl"] ?? config["GrpcServices:SubscriptionUrl"] ?? "http://subscription-service:5002";
    http.BaseAddress = new Uri(baseUrl);
});

// Gemini service registration
builder.Services.AddScoped<IGeminiAiService, GeminiAiService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

builder.Services.AddHttpClient("Gemini");

// JWT Auth
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "insecure-dev-key"))
    };
});

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Health Checks
builder.Services.AddHealthChecks()
    .AddCheck("gemini-key", () =>
    {
        var key = builder.Configuration["Gemini:ApiKey"];
        return string.IsNullOrWhiteSpace(key)
            ? HealthCheckResult.Unhealthy("Gemini API key missing")
            : HealthCheckResult.Healthy();
    });

var app = builder.Build();

// Gemini API key visibility (masked) for operational diagnostics
var geminiKey = app.Configuration["Gemini:ApiKey"];
if (string.IsNullOrWhiteSpace(geminiKey))
{
    app.Logger.LogWarning("Gemini API key is NOT configured (Gemini:ApiKey). AI endpoints will return fallback results.");
}
else
{
    var prefix = geminiKey.Length <= 4 ? geminiKey : geminiKey.Substring(0, 4);
    app.Logger.LogInformation("Gemini API key configured (len={Length}, prefix={Prefix}***).", geminiKey.Length, prefix);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint
app.MapHealthChecks("/health");

// Abonelik kontrolü middleware'i ekle
app.UseMiddleware<AIService.Middleware.SubscriptionCheckMiddleware>();

app.MapControllers();

app.Run();

// Exposed for test host
public partial class Program { }
