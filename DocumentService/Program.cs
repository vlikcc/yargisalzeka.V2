using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Net.Http.Json;
using DocumentService.DbContexts;
using Microsoft.EntityFrameworkCore;
using DocumentService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpClient("Subscription", (sp, http) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var baseUrl = config["SubscriptionService:BaseUrl"] ?? config["GrpcServices:SubscriptionUrl"] ?? "http://subscription-service:5002";
    http.BaseAddress = new Uri(baseUrl);
});

builder.Services.AddHttpClient("AIService", (sp, http) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var baseUrl = config["AIService:BaseUrl"] ?? "http://aiservice:5012";
    http.BaseAddress = new Uri(baseUrl);
    http.Timeout = TimeSpan.FromMinutes(2); // AI işlemleri için daha uzun timeout
});

builder.Services.AddDbContext<DocumentDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IPetitionGenerationService, PetitionGenerationService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = false,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "insecure-dev-key"))
        };
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Opsiyonel şema oluşturma (EnsureCreated)
var ensureCreated = app.Services.GetRequiredService<IConfiguration>().GetValue<bool>("Database:EnsureCreated");
if (ensureCreated)
{
    using var scope = app.Services.CreateScope();
    var ctx = scope.ServiceProvider.GetRequiredService<DocumentDbContext>();
    ctx.Database.EnsureCreated();
}
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
// Health endpoint for container health checks
app.MapGet("/health", () => Results.Ok("OK"));

app.Run();

public partial class Program { }
