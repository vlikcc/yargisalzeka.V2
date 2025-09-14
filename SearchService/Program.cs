
using Microsoft.EntityFrameworkCore;
using SearchService.DbContexts;
using OpenSearch.Client;
using SearchService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Net.Http.Json;

namespace SearchService;

public class Program
{
	public static void Main(string[] args)
	{
		var builder = WebApplication.CreateBuilder(args);

		builder.Services.AddControllers();
		builder.Services.AddEndpointsApiExplorer();
		builder.Services.AddSwaggerGen(); // Swagger eklendi

		builder.Services.AddDbContext<SearchDbContext>(options =>
			options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
		);

		// JWT auth
		builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
			.AddJwtBearer(o =>
			{
				o.TokenValidationParameters = new TokenValidationParameters
				{
					ValidateIssuer = false,
					ValidateAudience = false,
					ValidateLifetime = true,
					ValidateIssuerSigningKey = false,
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "insecure-dev-key"))
				};
			});

		// REST client for SubscriptionService
		builder.Services.AddHttpClient("Subscription", (sp, http) =>
		{
			var config = sp.GetRequiredService<IConfiguration>();
			var baseUrl = config["SubscriptionService:BaseUrl"] ?? config["GrpcServices:SubscriptionUrl"] ?? "http://subscription-service:5002";
			http.BaseAddress = new Uri(baseUrl);
		});

		// REST client for AI Service
		builder.Services.AddHttpClient("AIService", (sp, http) =>
		{
			var config = sp.GetRequiredService<IConfiguration>();
			var baseUrl = config["AIService:BaseUrl"] ?? "http://aiservice:5012";
			http.BaseAddress = new Uri(baseUrl);
		});

		// OpenSearch client
		builder.Services.AddSingleton<IOpenSearchClient>(sp =>
		{
			var config = sp.GetRequiredService<IConfiguration>();
			var uri = new Uri(config["OpenSearch:Uri"] ?? "http://localhost:9200");
			var settings = new ConnectionSettings(uri)
				.DisableDirectStreaming();
			var client = new OpenSearchClient(settings);
			return client;
		});

		// Provider selection (env override -> config)
		var provider = Environment.GetEnvironmentVariable("SEARCH_PROVIDER") ?? builder.Configuration["Search:Provider"] ?? "postgres";
		builder.Services.AddSingleton<SearchProcessingStore>();
		if (provider.Equals("opensearch", StringComparison.OrdinalIgnoreCase))
		{
			builder.Services.AddScoped<ISearchProvider, OpenSearchProvider>();
		}
		else if (provider.Equals("fulltext", StringComparison.OrdinalIgnoreCase))
		{
			builder.Services.AddScoped<ISearchProvider, FullTextSearchProvider>();
		}
		else
		{
			builder.Services.AddScoped<ISearchProvider, PostgresSearchProvider>(); // legacy ILIKE
		}

		var app = builder.Build();

		if (app.Environment.IsDevelopment())
		{
			app.UseSwagger(); // Swagger middleware eklendi
			app.UseSwaggerUI(c =>
			{
				c.SwaggerEndpoint("/swagger/v1/swagger.json", "SearchService API V1");
				c.RoutePrefix = string.Empty; // Root'ta açılsın
			});
		}

		// Health endpoint: veritabanı bağlantısını test et
		app.MapGet("/health", async (IServiceProvider sp) =>
		{
			try
			{
				using var scope = sp.CreateScope();
				var db = scope.ServiceProvider.GetRequiredService<SearchDbContext>();
				// Basit bir sorgu ile bağlantı testi
				await db.Database.ExecuteSqlRawAsync("SELECT 1;");
				return Results.Ok("Database connection: OK");
			}
			catch (Exception ex)
			{
				return Results.Problem($"Database connection error: {ex.Message}");
			}
		});

		// Opsiyonel şema oluşturma (EnsureCreated)
		var ensureCreated = app.Services.GetRequiredService<IConfiguration>().GetValue<bool>("Database:EnsureCreated");
		if (ensureCreated)
		{
			using (var scope = app.Services.CreateScope())
			{
				try
				{
					var db = scope.ServiceProvider.GetRequiredService<SearchDbContext>();
					db.Database.EnsureCreated();
					Console.WriteLine("[INFO] Database connection and creation successful.");
				}
				catch (Exception ex)
				{
					Console.WriteLine($"[ERROR] Database connection or creation failed: {ex.Message}");
				}
			}
		}

		app.UseAuthentication();
		app.UseAuthorization();
		app.MapControllers();

		app.Run();
	}
}
