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
    private readonly IPetitionGenerationService _petitionService;

    public PetitionController(IHttpClientFactory factory, ILogger<PetitionController> logger, IPetitionGenerationService petitionService)
    {
        _factory = factory;
        _logger = logger;
        _petitionService = petitionService;
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

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int take = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var history = await _petitionService.GetHistoryAsync(userId, take);
            var response = history.Select(p => new PetitionHistoryDto
            {
                Id = p.Id.ToString(),
                Topic = p.Topic,
                CreatedAt = p.CreatedAt,
                Status = "Completed" // Sabit değer, ileride genişletilebilir
            }).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dilekçe geçmişi yüklenirken hata oluştu - UserId: {UserId}", userId);
            return StatusCode(500, "Geçmiş yüklenemedi");
        }
    }
}

public record PetitionRequest(string Topic, string CaseText, List<string>? Decisions);
public record PetitionResponse { public string Content { get; set; } = string.Empty; }
public record PetitionHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? DownloadUrl { get; set; }
}

public class UsageStatsDto
{
    public int KeywordExtractionRemaining { get; set; }
    public int CaseAnalysisRemaining { get; set; }
    public int SearchRemaining { get; set; }
    public int PetitionRemaining { get; set; }
}
