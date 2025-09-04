using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot(builder.Configuration);

// Health Checks
builder.Services.AddHealthChecks();

// CORS for frontend on localhost:3000
builder.Services.AddCors(options =>
{
	options.AddPolicy("AllowFrontend", policy =>
	{
		policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
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

await app.UseOcelot();

app.Run();
