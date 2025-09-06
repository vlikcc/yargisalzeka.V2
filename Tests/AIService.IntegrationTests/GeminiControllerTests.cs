using System.Net.Http;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using System.Threading.Tasks;
using System.Net.Http.Headers;
using System.Text.Json;
using System;

namespace AIService.IntegrationTests;

public class GeminiControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public GeminiControllerTests(WebApplicationFactory<Program> factory) => _factory = factory;

    // NOTE: These tests assume a valid Gemini API key is configured in test environment.
    // They are marked Skip by default to avoid failing CI without key.

    private HttpClient CreateAuthedClient()
    {
        var client = _factory.CreateClient();
        // Provide a fake JWT if real validation expects issuer/audience but uses dev key
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateFakeJwt());
        return client;
    }

    private string GenerateFakeJwt() => "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."+
        "eyJzdWIiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJqdGkiOiIxMjM0NTYiLCJyb2xlIjoiVXNlciIsImlzcyI6InRlc3QtaXNzdWVyIiwiYXVkIjoidGVzdC1hdWQiLCJleHAiIjoxOTAwMDAwMDAwfQ."+
        "dGVzdGtleWZha2VzaWduYXR1cmU"; // NOT a real signature, validation relaxed in dev

    [Fact(Skip="Provide Gemini API key then remove skip")] 
    public async Task ExtractKeywords_ReturnsListOrEmpty()
    {
        var client = CreateAuthedClient();
        var resp = await client.PostAsJsonAsync("/api/gemini/extract-keywords", new { caseText = "Basit kira sözleşmesi uyuşmazlığı" });
        Assert.True(resp.IsSuccessStatusCode, "Status code was " + resp.StatusCode);
        var list = await resp.Content.ReadFromJsonAsync<string[]>() ?? Array.Empty<string>();
        Assert.NotNull(list);
    }

    [Fact(Skip="Provide Gemini API key then remove skip")] 
    public async Task AnalyzeCase_ReturnsAnalysisResultField()
    {
        var client = CreateAuthedClient();
        var resp = await client.PostAsJsonAsync("/api/gemini/analyze-case", new { caseText = "Trafik kazası sonucu maddi ve manevi tazminat talebi" });
        Assert.True(resp.IsSuccessStatusCode, "Status code was " + resp.StatusCode);
        var doc = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(doc.TryGetProperty("analysisResult", out _), "analysisResult alanı yok");
    }

    [Fact(Skip="Provide Gemini API key then remove skip")] 
    public async Task AnalyzeRelevance_ReturnsScore()
    {
        var client = CreateAuthedClient();
        var resp = await client.PostAsJsonAsync("/api/gemini/analyze-relevance", new { caseText = "İş sözleşmesi feshi", decisionText = "Yargıtay karar metni örneği" });
        Assert.True(resp.IsSuccessStatusCode, "Status code was " + resp.StatusCode);
        var doc = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(doc.TryGetProperty("score", out _), "score alanı yok");
    }

    [Fact(Skip="Provide Gemini API key then remove skip")] 
    public async Task GeneratePetition_ReturnsText()
    {
        var client = CreateAuthedClient();
        var resp = await client.PostAsJsonAsync("/api/gemini/generate-petition", new { caseText = "Basit alacak davası", relevantDecisions = Array.Empty<object>() });
        Assert.True(resp.IsSuccessStatusCode, "Status code was " + resp.StatusCode);
        var text = await resp.Content.ReadAsStringAsync();
        Assert.False(string.IsNullOrWhiteSpace(text));
    }
}
