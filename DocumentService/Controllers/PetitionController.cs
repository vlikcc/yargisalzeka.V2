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
    [ProducesResponseType(typeof(PetitionResponse), 200)]
    public async Task<IActionResult> Generate([FromBody] PetitionRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var sub = _factory.CreateClient("Subscription");
        var tokenHeader = Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(tokenHeader)) sub.DefaultRequestHeaders.Add("Authorization", tokenHeader);
        
        UsageStatsDto? usage = null;
        try
        {
            usage = await sub.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage", ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Subscription service erişim hatası");
        }
        
        if (usage == null) return StatusCode(502, "Subscription service unreachable");
        if (usage.PetitionRemaining == 0) return Forbid("Limit tükendi");

        try
        {
            // Auth token'ı service'e aktar (AI çağrısı için)
            _petitionService.SetAuthToken(tokenHeader);
            
            // AI destekli dilekçe üretimi
            var petition = await _petitionService.GenerateAsync(userId, request, ct);
            
            // Quota düşür
            await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = "Petition" }, ct);
            
            return Ok(new PetitionResponse 
            { 
                Id = petition.Id.ToString(),
                Content = petition.Content,
                Topic = petition.Topic,
                CreatedAt = petition.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dilekçe oluşturma hatası - UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Dilekçe oluşturulamadı", details = ex.Message });
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(PetitionDetailResponse), 200)]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var petition = await _petitionService.GetByIdAsync(id, userId, ct);
        if (petition == null) return NotFound("Dilekçe bulunamadı");

        return Ok(new PetitionDetailResponse
        {
            Id = petition.Id.ToString(),
            Topic = petition.Topic,
            CaseText = petition.CaseText,
            Content = petition.Content,
            Decisions = string.IsNullOrEmpty(petition.DecisionsJson) 
                ? new List<string>() 
                : System.Text.Json.JsonSerializer.Deserialize<List<string>>(petition.DecisionsJson) ?? new List<string>(),
            CreatedAt = petition.CreatedAt
        });
    }

    [HttpGet("history")]
    [ProducesResponseType(typeof(List<PetitionHistoryDto>), 200)]
    public async Task<IActionResult> GetHistory([FromQuery] int take = 20, CancellationToken ct = default)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var history = await _petitionService.GetHistoryAsync(userId, take, ct);
            var response = history.Select(p => new PetitionHistoryDto
            {
                Id = p.Id.ToString(),
                Topic = p.Topic,
                CreatedAt = p.CreatedAt,
                Status = "Completed",
                Preview = p.Content.Length > 200 ? p.Content.Substring(0, 200) + "..." : p.Content
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

public class PetitionResponse 
{ 
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class PetitionDetailResponse
{
    public string Id { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string CaseText { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Decisions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class PetitionHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Preview { get; set; }
    public string? DownloadUrl { get; set; }
}

public class UsageStatsDto
{
    public int KeywordExtractionRemaining { get; set; }
    public int CaseAnalysisRemaining { get; set; }
    public int SearchRemaining { get; set; }
    public int PetitionRemaining { get; set; }
}
