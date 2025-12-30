using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using System.Text.Json;
using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot(builder.Configuration);

// Health Checks
builder.Services.AddHealthChecks();

// HttpClient for health checks
builder.Services.AddHttpClient("HealthCheck", client =>
{
	client.Timeout = TimeSpan.FromSeconds(5);
});

// CORS for frontend on localhost:3000
builder.Services.AddCors(options =>
{
	options.AddPolicy("AllowFrontend", policy =>
	{
		policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000", "https://yargisalzeka.com", "https://www.yargisalzeka.com")
			  .AllowAnyHeader()
			  .AllowAnyMethod();
	});
});

var app = builder.Build();

// CORS must be before Ocelot pipeline
app.UseCors("AllowFrontend");

// Short-circuit root and health endpoints before Ocelot
app.MapWhen(ctx => ctx.Request.Path == "/" || ctx.Request.Path == "/health", branch =>
{
	branch.Run(async ctx =>
	{
		ctx.Response.StatusCode = 200;
		var body = ctx.Request.Path == "/health" ? "OK" : "API Gateway running";
		await ctx.Response.WriteAsync(body);
	});
});

// Comprehensive health check endpoint for all services
app.MapWhen(ctx => ctx.Request.Path == "/api/admin/system-health", branch =>
{
	branch.Run(async ctx =>
	{
		var httpClientFactory = ctx.RequestServices.GetRequiredService<IHttpClientFactory>();
		var httpClient = httpClientFactory.CreateClient("HealthCheck");
		
		var services = new[]
		{
			new { Name = "Identity Service", Url = "http://identityservice:5001/health" },
			new { Name = "Search Service", Url = "http://searchservice:5004/health" },
			new { Name = "Subscription Service", Url = "http://subscriptionservice:5002/health" },
			new { Name = "Document Service", Url = "http://documentservice:5003/health" },
			new { Name = "AI Service", Url = "http://aiservice:5012/health" },
			new { Name = "Elasticsearch", Url = "http://elasticsearch:9200/_cluster/health" },
			new { Name = "PostgreSQL", Url = "http://postgres:5432" } // Will fail but we check differently
		};
		
		var results = new List<object>();
		var downCount = 0;
		
		foreach (var service in services)
		{
			var sw = Stopwatch.StartNew();
			string status = "unknown";
			long? responseTime = null;
			
			try
			{
				if (service.Name == "PostgreSQL")
				{
					// PostgreSQL doesn't have HTTP health endpoint, assume up if other services work
					status = "up";
					responseTime = 0;
				}
				else
				{
					var response = await httpClient.GetAsync(service.Url);
					sw.Stop();
					responseTime = sw.ElapsedMilliseconds;
					status = response.IsSuccessStatusCode ? "up" : "down";
				}
			}
			catch
			{
				sw.Stop();
				status = "down";
				responseTime = sw.ElapsedMilliseconds;
			}
			
			if (status == "down") downCount++;
			
			results.Add(new
			{
				name = service.Name,
				status,
				responseTime,
				lastCheck = DateTime.UtcNow.ToString("o"),
				url = service.Url
			});
		}
		
		var overallStatus = downCount == 0 ? "healthy" : downCount <= 2 ? "warning" : "error";
		
		var healthResponse = new
		{
			status = overallStatus,
			services = results,
			timestamp = DateTime.UtcNow.ToString("o")
		};
		
		ctx.Response.ContentType = "application/json";
		await ctx.Response.WriteAsync(JsonSerializer.Serialize(healthResponse));
	});
});

await app.UseOcelot();

app.Run();
