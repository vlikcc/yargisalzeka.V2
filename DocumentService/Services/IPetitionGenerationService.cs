using DocumentService.Entities;
using DocumentService.Controllers;

namespace DocumentService.Services;

public interface IPetitionGenerationService
{
    Task<PetitionDocument> GenerateAsync(string userId, PetitionRequest request, CancellationToken ct = default);
    Task<List<PetitionDocument>> GetHistoryAsync(string userId, int take = 20, CancellationToken ct = default);
}
