using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;

namespace E2E;

public class EndToEndSmokeTests
{
    private readonly HttpClient _gateway;
    public EndToEndSmokeTests()
    {
        // Assumes all services + gateway running via docker-compose before executing tests.
        _gateway = new HttpClient{ BaseAddress = new Uri("http://localhost:5000") };
    }

    [Fact(Skip="Requires running full environment (docker-compose up)" )]
    public async Task Register_Login_And_Call_Gemini_Keyword()
    {
        var email = $"user{Guid.NewGuid():N}@test.com";
        var password = "Pass123!";

        var regResp = await _gateway.PostAsJsonAsync("/auth/register", new { email, password });
        regResp.IsSuccessStatusCode.Should().BeTrue();

        var loginResp = await _gateway.PostAsJsonAsync("/auth/login", new { email, password });
        loginResp.IsSuccessStatusCode.Should().BeTrue();
        var loginJson = JsonDocument.Parse(await loginResp.Content.ReadAsStringAsync());
        var token = loginJson.RootElement.GetProperty("token").GetString();
        token.Should().NotBeNullOrEmpty();

        _gateway.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var keywordResp = await _gateway.PostAsJsonAsync("/gemini/extract-keywords", new { caseText = "Basit olay" });
        keywordResp.IsSuccessStatusCode.Should().BeTrue();
    }
}
