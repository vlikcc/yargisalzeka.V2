using System.Text;
using System.Text.Json;
using DocumentService.DbContexts;
using DocumentService.Entities;
using DocumentService.Controllers;
using Microsoft.EntityFrameworkCore;

namespace DocumentService.Services;

public class PetitionGenerationService : IPetitionGenerationService
{
    private readonly DocumentDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PetitionGenerationService> _logger;

    public PetitionGenerationService(
        DocumentDbContext db, 
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<PetitionGenerationService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    private string? _authToken;
    
    public void SetAuthToken(string? token)
    {
        _authToken = token;
    }

    public async Task<PetitionDocument> GenerateAsync(string userId, PetitionRequest request, CancellationToken ct = default)
    {
        var decisionsList = request.Decisions ?? new List<string>();
        string content;
        
        try
        {
            // AIService'e dilekçe üretimi için istek gönder
            content = await GenerateWithAIAsync(request.Topic, request.CaseText, decisionsList, ct);
            _logger.LogInformation("AI dilekçe üretimi başarılı");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI dilekçe üretimi başarısız, fallback şablona geçiliyor");
            // Fallback: Basit şablon
            content = GenerateFallbackPetition(request.Topic, request.CaseText, decisionsList);
        }

        var entity = new PetitionDocument
        {
            UserId = userId,
            Topic = request.Topic,
            CaseText = request.CaseText,
            DecisionsJson = decisionsList.Count == 0 ? null : JsonSerializer.Serialize(decisionsList),
            Content = content,
            CreatedAt = DateTime.UtcNow
        };
        _db.PetitionDocuments.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    private async Task<string> GenerateWithAIAsync(string topic, string caseText, List<string> decisions, CancellationToken ct)
    {
        var aiServiceBase = _configuration["AIService:BaseUrl"] ?? "http://aiservice:5012";
        var client = _httpClientFactory.CreateClient();
        
        // Authorization header ekle
        if (!string.IsNullOrEmpty(_authToken))
        {
            client.DefaultRequestHeaders.Add("Authorization", _authToken);
        }
        
        // AIService'in beklediği format
        var payload = new
        {
            caseText = caseText,
            relevantDecisions = decisions.Select(d => new { title = d, summary = d }).ToList()
        };
        
        _logger.LogInformation("AIService dilekçe isteği gönderiliyor: {Url}", $"{aiServiceBase}/api/gemini/generate-petition");
        
        var response = await client.PostAsync(
            $"{aiServiceBase}/api/gemini/generate-petition",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("AIService dilekçe üretim hatası: {Status} - {Body}", response.StatusCode, errorBody);
            throw new HttpRequestException($"AI dilekçe üretimi başarısız: {response.StatusCode}");
        }

        var result = await response.Content.ReadAsStringAsync(ct);
        _logger.LogInformation("AIService dilekçe yanıtı alındı, uzunluk: {Length}", result.Length);
        
        // AIService doğrudan string döndürüyor
        return result.Trim('"'); // JSON string escape'lerini temizle
    }

    private static string GenerateFallbackPetition(string topic, string caseText, List<string> decisions)
    {
        return $@"DİLEKÇE TASLAĞI
═══════════════════════════════════════════════════════════

KONU: {topic}

───────────────────────────────────────────────────────────
OLAY METNİ:
───────────────────────────────────────────────────────────
{caseText}

───────────────────────────────────────────────────────────
EMSAL KARARLAR:
───────────────────────────────────────────────────────────
{string.Join("\n", decisions.Select(d => "• " + d))}

───────────────────────────────────────────────────────────
TALEP:
───────────────────────────────────────────────────────────
Yukarıda açıklanan nedenlerle ve emsal kararlar çerçevesinde, 
ilgili mevzuat hükümleri uyarınca gereğinin yapılmasını 
saygılarımla arz ederim.

                                                    Tarih: {DateTime.Now:dd.MM.yyyy}
                                                    İmza: _______________
═══════════════════════════════════════════════════════════";
    }

    public async Task<List<PetitionDocument>> GetHistoryAsync(string userId, int take = 20, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        return await _db.PetitionDocuments
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(ct);
    }

    public async Task<PetitionDocument?> GetByIdAsync(long id, string userId, CancellationToken ct = default)
    {
        return await _db.PetitionDocuments
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId, ct);
    }
}
