using Microsoft.EntityFrameworkCore;
using SubscriptionService;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

var builder = WebApplication.CreateBuilder(args);

// Do not map inbound JWT claim types (keep 'sub' as-is)
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// Choose provider based on environment / config//
var useInMemory = builder.Environment.IsEnvironment("Testing") ||
                  builder.Configuration.GetValue<bool>("UseInMemoryDatabase");

if (useInMemory)
{
    builder.Services.AddDbContext<SubscriptionDbContext>(options =>
        options.UseInMemoryDatabase("subscription-test-db"));
}
else
{
    builder.Services.AddDbContext<SubscriptionDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization();

// JWT Authentication (required by [Authorize] on controllers)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
    o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "insecure-dev-key")),
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            ClockSkew = TimeSpan.Zero
        };
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("JwtAuth");
                var hasAuth = context.Request.Headers.ContainsKey("Authorization");
                logger.LogInformation("Auth header present: {HasAuth}", hasAuth);
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("JwtAuth");
                var sub = context.Principal?.FindFirst("sub")?.Value;
                logger.LogInformation("JWT validated. sub={Sub}", sub);
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("JwtAuth");
                logger.LogError(context.Exception, "JWT authentication failed");
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("JwtAuth");
                logger.LogWarning("JWT challenge: {Error} - {Description}", context.Error, context.ErrorDescription);
                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

// Database initialization: ensure schema exists even if an empty __EFMigrationsHistory table is present
using (var scope = app.Services.CreateScope())
{
    var ctx = scope.ServiceProvider.GetRequiredService<SubscriptionDbContext>();
    try
    {
        // Create database if it doesn't exist
        ctx.Database.EnsureCreated();

        // If only __EFMigrationsHistory exists (from a previous attempt), drop it so EnsureCreated can create tables
        var hasOnlyHistory = false;
        try
        {
            var count = ctx.Database.ExecuteSqlRaw(@"SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> '__EFMigrationsHistory' LIMIT 1;");
            // ExecuteSqlRaw returns -1 for SELECT; use scalar query via raw connection instead
            hasOnlyHistory = false; // will compute below
        }
        catch { /* ignore */ }

        await using var conn = ctx.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> '__EFMigrationsHistory'";
            var result = await cmd.ExecuteScalarAsync();
            var nonHistoryTables = Convert.ToInt32(result);
            hasOnlyHistory = nonHistoryTables == 0;
        }

        if (hasOnlyHistory)
        {
            // Drop the history table to allow EnsureCreated to create the schema
            ctx.Database.ExecuteSqlRaw("DROP TABLE IF EXISTS \"__EFMigrationsHistory\";");
            ctx.Database.EnsureCreated();
        }

        // Seed plans defensively if seeding didn't run
        if (!ctx.SubscriptionPlans.Any())
        {
            ctx.SubscriptionPlans.AddRange(
                new SubscriptionPlan { Id = 1, Name = "Trial", Price = 0m, ValidityDays = 3, KeywordExtractionLimit = -1, CaseAnalysisLimit = 5, SearchLimit = 5, PetitionLimit = 1, IsActive = true },
                new SubscriptionPlan { Id = 2, Name = "Temel", Price = 199m, ValidityDays = null, KeywordExtractionLimit = -1, CaseAnalysisLimit = 5, SearchLimit = 5, PetitionLimit = 0, IsActive = true },
                new SubscriptionPlan { Id = 3, Name = "Standart", Price = 499m, ValidityDays = null, KeywordExtractionLimit = -1, CaseAnalysisLimit = 50, SearchLimit = 250, PetitionLimit = 10, IsActive = true },
                new SubscriptionPlan { Id = 4, Name = "Premium", Price = 999m, ValidityDays = null, KeywordExtractionLimit = -1, CaseAnalysisLimit = -1, SearchLimit = -1, PetitionLimit = -1, IsActive = true }
            );
            ctx.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbInit");
        logger.LogError(ex, "Failed to initialize SubscriptionService database");
        throw;
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => "SubscriptionService is running. Use the REST API under /api/subscription.");
// Simple health endpoint for container health checks
app.MapGet("/health", () => Results.Ok("OK"));

app.Run();

public partial class Program { }
