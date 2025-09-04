using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Json;
using System.Security.Claims;
using DocumentService.Services;
using DocumentService.Entities;


namespace DocumentService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PetitionController : ControllerBase
{
    private readonly IHttpClientFactory _factory;
    private readonly ILogger<PetitionController> _logger;

    public PetitionController(IHttpClientFactory factory, ILogger<PetitionController> logger)
    {
        _factory = factory;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] PetitionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
    var sub = _factory.CreateClient("Subscription");
    var tokenHeader = Request.Headers["Authorization"].ToString();
    if (!string.IsNullOrEmpty(tokenHeader)) sub.DefaultRequestHeaders.Add("Authorization", tokenHeader);
    var usage = await sub.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage");
    if (usage == null) return StatusCode(502, "Subscription service unreachable");
    if (usage.PetitionRemaining == 0) return Forbid("Limit tükendi");

        // TODO: gerçek dilekçe üretim servisini entegre et
        var content = $"Dilekçe taslağı (konu: {request.Topic})";

    await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = "Petition" });
        return Ok(new PetitionResponse { Content = content });
    }
}

public record PetitionRequest(string Topic, string CaseText, List<string>? Decisions);
public record PetitionResponse { public string Content { get; set; } = string.Empty; }

public class UsageStatsDto
{
    public int KeywordExtractionRemaining { get; set; }
    public int CaseAnalysisRemaining { get; set; }
    public int SearchRemaining { get; set; }
    public int PetitionRemaining { get; set; }
}
