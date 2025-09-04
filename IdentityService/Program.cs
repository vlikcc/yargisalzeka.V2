using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using IdentityService.DbContexts;
using IdentityService.Entities;
using System.Net.Http.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<IdentitiyDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 6;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireDigit = false;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<IdentitiyDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    var jwtKey = builder.Configuration["Jwt:Key"] ?? "insecure-dev-key-change-me-at-least-32-chars";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database creation policy (default true to ease container bring-up)
var ensureCreated = builder.Configuration.GetValue<bool?>("Database:EnsureCreated") ?? true;
var useMigrations = builder.Configuration.GetValue<bool?>("Database:UseMigrations") ?? true;

// Health Checks
builder.Services.AddHealthChecks();

// REST client for SubscriptionService (optional usage in controllers)
builder.Services.AddHttpClient("Subscription", (sp, http) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var baseUrl = config["SubscriptionService:BaseUrl"] ?? config["GrpcServices:SubscriptionUrl"] ?? "http://subscription-service:5002";
    http.BaseAddress = new Uri(baseUrl);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Database initialization
using (var scope = app.Services.CreateScope())
{
    var ctx = scope.ServiceProvider.GetRequiredService<IdentitiyDbContext>();
    var hasMigrations = ctx.Database.GetMigrations().Any();
    if (ensureCreated && (!useMigrations || !hasMigrations))
    {
        ctx.Database.EnsureCreated();
    }
    else if (useMigrations && hasMigrations)
    {
        try
        {
            var pending = ctx.Database.GetPendingMigrations();
            if (pending.Any())
            {
                ctx.Database.Migrate();
            }
        }
        catch
        {
            ctx.Database.EnsureCreated();
        }
    }
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint
app.MapHealthChecks("/health");

app.MapControllers();
app.Run();

public partial class Program { }
