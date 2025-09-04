using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using System.Threading.Tasks;

namespace AIService.IntegrationTests;

public class GeminiControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public GeminiControllerTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact(Skip="Requires real Gemini API key - provide key then remove Skip")] 
    public async Task ExtractKeywords_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/gemini/extract-keywords", new { caseText = "Basit olay" });
        Assert.True(resp.IsSuccessStatusCode);
    }
}
