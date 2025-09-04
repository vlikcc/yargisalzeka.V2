using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace SubscriptionService.Controllers;

[ApiController]
[Route("api/subscription/admin/plans")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminPlansController : ControllerBase
{
    private readonly SubscriptionDbContext _db;
    private readonly ILogger<AdminPlansController> _logger;

    public AdminPlansController(SubscriptionDbContext db, ILogger<AdminPlansController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdminPlanDto>>> GetAll()
    {
        var plans = await _db.SubscriptionPlans
            .OrderBy(p => p.Price)
            .Select(p => new AdminPlanDto(
                p.Id,
                p.Name,
                p.Price,
                p.ValidityDays,
                p.KeywordExtractionLimit,
                p.CaseAnalysisLimit,
                p.SearchLimit,
                p.PetitionLimit,
                p.IsActive
            ))
            .ToListAsync();
        return Ok(plans);
    }

    [HttpPost]
    public async Task<ActionResult<SubscriptionPlan>> Create([FromBody] PlanCreateUpdateDto dto)
    {
        var exists = await _db.SubscriptionPlans.AnyAsync(p => p.Name == dto.Name);
        if (exists) return Conflict("Aynı isimde plan mevcut");

        var plan = new SubscriptionPlan
        {
            Name = dto.Name,
            Price = dto.Price,
            ValidityDays = dto.ValidityDays,
            KeywordExtractionLimit = dto.KeywordExtractionLimit,
            CaseAnalysisLimit = dto.CaseAnalysisLimit,
            SearchLimit = dto.SearchLimit,
            PetitionLimit = dto.PetitionLimit,
            IsActive = dto.IsActive,
            UpdatedAt = DateTime.UtcNow
        };
        _db.SubscriptionPlans.Add(plan);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = plan.Id }, plan);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, [FromBody] PlanCreateUpdateDto dto)
    {
        var plan = await _db.SubscriptionPlans.FindAsync(id);
        if (plan == null) return NotFound();

        plan.Name = dto.Name;
        plan.Price = dto.Price;
        plan.ValidityDays = dto.ValidityDays;
        plan.KeywordExtractionLimit = dto.KeywordExtractionLimit;
        plan.CaseAnalysisLimit = dto.CaseAnalysisLimit;
        plan.SearchLimit = dto.SearchLimit;
        plan.PetitionLimit = dto.PetitionLimit;
        plan.IsActive = dto.IsActive;
        plan.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/toggle")]
    public async Task<ActionResult> ToggleStatus(int id)
    {
        var plan = await _db.SubscriptionPlans.FindAsync(id);
        if (plan == null) return NotFound();
        plan.IsActive = !plan.IsActive;
        plan.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { plan.Id, plan.IsActive });
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var plan = await _db.SubscriptionPlans.FindAsync(id);
        if (plan == null) return NotFound();

        var hasSubscribers = await _db.UserSubscriptions.AnyAsync(s => s.SubscriptionPlanId == id);
        if (hasSubscribers)
        {
            // Soft-disable instead of hard delete if in use
            plan.IsActive = false;
            plan.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { Message = "Plan aboneler tarafından kullanıldığı için pasif hale getirildi" });
        }

        _db.SubscriptionPlans.Remove(plan);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record PlanCreateUpdateDto
(
    string Name,
    decimal Price,
    int? ValidityDays,
    int KeywordExtractionLimit,
    int CaseAnalysisLimit,
    int SearchLimit,
    int PetitionLimit,
    bool IsActive
);

public record AdminPlanDto
(
    int Id,
    string Name,
    decimal Price,
    int? ValidityDays,
    int KeywordExtractionLimit,
    int CaseAnalysisLimit,
    int SearchLimit,
    int PetitionLimit,
    bool IsActive
);
