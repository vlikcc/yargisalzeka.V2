using System.Text.Json;
using DocumentService.DbContexts;
using DocumentService.Entities;
using DocumentService.Controllers;
using Microsoft.EntityFrameworkCore;

namespace DocumentService.Services;

public class PetitionGenerationService : IPetitionGenerationService
{
    private readonly DocumentDbContext _db;
    private readonly ILogger<PetitionGenerationService> _logger;

    public PetitionGenerationService(DocumentDbContext db, ILogger<PetitionGenerationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PetitionDocument> GenerateAsync(string userId, PetitionRequest request, CancellationToken ct = default)
    {
        var decisionsList = request.Decisions ?? new List<string>();
    var content = $@"DİLEKÇE TASLAĞI
KONU: {request.Topic}

OLAY METNİ:
{request.CaseText}

EMSAL KARARLAR:
{string.Join("\n", decisionsList.Select(d => "- " + d))}

TALEP:
İlgili mevzuat çerçevesinde gereğinin yapılmasını arz ederim.";

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

    public async Task<List<PetitionDocument>> GetHistoryAsync(string userId, int take = 20, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        return await _db.PetitionDocuments
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(ct);
    }
}
