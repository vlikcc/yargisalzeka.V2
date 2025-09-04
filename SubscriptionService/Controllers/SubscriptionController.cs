using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace SubscriptionService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubscriptionController : ControllerBase
{
    private readonly SubscriptionDbContext _dbContext;
    private readonly ILogger<SubscriptionController> _logger;

    public SubscriptionController(SubscriptionDbContext dbContext, ILogger<SubscriptionController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpGet("current")]
    public async Task<ActionResult<UserSubscriptionDto>> GetCurrentSubscription()
    {
    var userId = User.FindFirstValue("sub") ?? User.Identity?.Name; // prefer 'sub' claim
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var sub = await _dbContext.UserSubscriptions.Include(s => s.SubscriptionPlan)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.IsActive);
        if (sub == null) return Ok(null);
        return new UserSubscriptionDto(
            sub.Id,
            sub.SubscriptionPlan?.Name ?? string.Empty,
            sub.StartDate,
            sub.EndDate,
            sub.IsActive
        );
    }

    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<ActionResult<List<SubscriptionPlanDto>>> GetSubscriptionPlans()
    {
        var plans = await _dbContext.SubscriptionPlans.Where(p => p.IsActive)
            .OrderBy(p => p.Price)
            .Select(p => new SubscriptionPlanDto(
                p.Id,
                p.Name,
                p.Price,
                p.ValidityDays,
                p.KeywordExtractionLimit,
                p.CaseAnalysisLimit,
                p.SearchLimit,
                p.PetitionLimit
            )).ToListAsync();
        return plans;
    }

    [HttpPost("upgrade")]
    public async Task<ActionResult> UpgradeSubscription([FromBody] UpgradeSubscriptionRequest request)
    {
    var userId = User.FindFirstValue("sub") ?? User.Identity?.Name;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var plan = await _dbContext.SubscriptionPlans.FindAsync(request.PlanId);
        if (plan == null) return NotFound("Plan bulunamadı");

        var now = DateTime.UtcNow;
        var activeSubs = await _dbContext.UserSubscriptions.Where(s => s.UserId == userId && s.IsActive).ToListAsync();
        foreach (var s in activeSubs) s.IsActive = false;
        var newSub = new UserSubscription
        {
            UserId = userId,
            SubscriptionPlanId = plan.Id,
            StartDate = now,
            EndDate = plan.ValidityDays.HasValue ? now.AddDays(plan.ValidityDays.Value) : null,
            IsActive = true
        };
        _dbContext.UserSubscriptions.Add(newSub);
        await _dbContext.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("usage")]
    public async Task<ActionResult<UsageStatsDto>> GetUsageStats()
    {
    var userId = User.FindFirstValue("sub") ?? User.Identity?.Name;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var sub = await _dbContext.UserSubscriptions.OrderByDescending(s => s.StartDate).FirstOrDefaultAsync(s => s.UserId == userId && s.IsActive);
        if (sub == null) return NotFound();
        var plan = await _dbContext.SubscriptionPlans.FindAsync(sub.SubscriptionPlanId);
        var usages = await _dbContext.UsageTrackings.Where(u => u.UserSubscriptionId == sub.Id).ToListAsync();
        int Rem(string feature, int limit) {
            if (limit < 0) return -1;
            var used = usages.FirstOrDefault(u => u.FeatureType == feature)?.UsedCount ?? 0;
            return Math.Max(0, limit - used);
        }
        return new UsageStatsDto
        {
            KeywordExtractionRemaining = Rem("KeywordExtraction", plan!.KeywordExtractionLimit),
            CaseAnalysisRemaining = Rem("CaseAnalysis", plan.CaseAnalysisLimit),
            SearchRemaining = Rem("Search", plan.SearchLimit),
            PetitionRemaining = Rem("Petition", plan.PetitionLimit)
        };
    }

    [HttpGet("remaining-credits")]
    public async Task<ActionResult<RemainingCreditsDto>> GetRemainingCredits()
    {
        var usage = await GetUsageStats();
        if (usage.Result is ObjectResult o && o.Value is UsageStatsDto u)
        {
            return new RemainingCreditsDto
            {
                KeywordExtraction = u.KeywordExtractionRemaining,
                CaseAnalysis = u.CaseAnalysisRemaining,
                Search = u.SearchRemaining,
                Petition = u.PetitionRemaining
            };
        }
        return NotFound();
    }

    [HttpPost("consume")]
    public async Task<ActionResult> ConsumeFeature([FromBody] ConsumeFeatureRequestDto request)
    {
        var userId = User.Identity?.Name;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var sub = await _dbContext.UserSubscriptions.Include(s => s.SubscriptionPlan)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.IsActive);
        if (sub == null) return Forbid();
        var usage = await _dbContext.UsageTrackings.FirstOrDefaultAsync(u => u.UserSubscriptionId == sub.Id && u.FeatureType == request.FeatureType);
        if (usage == null)
        {
            usage = new UsageTracking { UserId = userId, UserSubscriptionId = sub.Id, FeatureType = request.FeatureType, UsedCount = 0, ResetDate = DateTime.UtcNow };
            _dbContext.UsageTrackings.Add(usage);
        }
        usage.UsedCount += 1;
        usage.LastUsed = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("assign-trial")]
    [AllowAnonymous]
    public async Task<ActionResult> AssignTrialSubscription([FromBody] AssignTrialRequestDto request)
    {
        var existing = await _dbContext.UserSubscriptions.AnyAsync(s => s.UserId == request.UserId && s.IsActive);
        if (existing) return Conflict("Aktif abonelik mevcut");
        var trialPlan = await _dbContext.SubscriptionPlans.FirstOrDefaultAsync(p => p.Name == "Trial");
        if (trialPlan == null) return StatusCode(500, "Trial plan yok");
        var sub = new UserSubscription
        {
            UserId = request.UserId,
            SubscriptionPlanId = trialPlan.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(trialPlan.ValidityDays ?? 3),
            IsActive = true
        };
        _dbContext.UserSubscriptions.Add(sub);
        await _dbContext.SaveChangesAsync();
        return Ok();
    }
}

public record UserSubscriptionDto(int Id, string PlanName, DateTime StartDate, DateTime? EndDate, bool IsActive);
public record SubscriptionPlanDto(int Id, string Name, decimal Price, int? ValidityDays, int KeywordExtractionLimit, int CaseAnalysisLimit, int SearchLimit, int PetitionLimit);
public record UpgradeSubscriptionRequest(int PlanId);
public record UsageStatsDto
{
    public int KeywordExtractionRemaining { get; set; }
    public int CaseAnalysisRemaining { get; set; }
    public int SearchRemaining { get; set; }
    public int PetitionRemaining { get; set; }
}
public record RemainingCreditsDto
{
    public int KeywordExtraction { get; set; }
    public int CaseAnalysis { get; set; }
    public int Search { get; set; }
    public int Petition { get; set; }
}
public record ConsumeFeatureRequestDto(string FeatureType);
public record AssignTrialRequestDto(string UserId);
