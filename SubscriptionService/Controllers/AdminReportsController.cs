using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace SubscriptionService.Controllers;

[ApiController]
[Route("api/subscription/admin/reports")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminReportsController : ControllerBase
{
    private readonly SubscriptionDbContext _db;
    private readonly ILogger<AdminReportsController> _logger;

    public AdminReportsController(SubscriptionDbContext db, ILogger<AdminReportsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // Gelir özeti
    [HttpGet("revenue")]
    public async Task<ActionResult> GetRevenueStats([FromQuery] int days = 30)
    {
        days = Math.Clamp(days, 1, 365);
        var startDate = DateTime.UtcNow.AddDays(-days);

        // Tüm abonelikleri al
        var subscriptions = await _db.UserSubscriptions
            .Include(s => s.SubscriptionPlan)
            .Where(s => s.StartDate >= startDate)
            .ToListAsync();

        // Toplam gelir (Trial hariç)
        var totalRevenue = subscriptions
            .Where(s => s.SubscriptionPlan != null && s.SubscriptionPlan.Price > 0)
            .Sum(s => s.SubscriptionPlan!.Price);

        // Plan bazlı gelir
        var revenueByPlan = subscriptions
            .Where(s => s.SubscriptionPlan != null)
            .GroupBy(s => s.SubscriptionPlan!.Name)
            .Select(g => new PlanRevenueDto(
                g.Key,
                g.Count(),
                g.Sum(s => s.SubscriptionPlan!.Price)
            ))
            .OrderByDescending(x => x.Revenue)
            .ToList();

        // Günlük gelir
        var dailyRevenue = subscriptions
            .Where(s => s.SubscriptionPlan != null && s.SubscriptionPlan.Price > 0)
            .GroupBy(s => s.StartDate.Date)
            .Select(g => new DailyRevenueDto(
                g.Key,
                g.Count(),
                g.Sum(s => s.SubscriptionPlan!.Price)
            ))
            .OrderBy(x => x.Date)
            .ToList();

        // Aktif abonelik sayısı
        var activeSubscriptions = await _db.UserSubscriptions
            .CountAsync(s => s.IsActive);

        // Toplam abonelik sayısı
        var totalSubscriptions = await _db.UserSubscriptions.CountAsync();

        // Bu dönemdeki yeni abonelikler
        var newSubscriptions = subscriptions.Count;

        return Ok(new
        {
            totalRevenue,
            activeSubscriptions,
            totalSubscriptions,
            newSubscriptions,
            revenueByPlan,
            dailyRevenue
        });
    }

    // Abonelik istatistikleri
    [HttpGet("subscriptions")]
    public async Task<ActionResult> GetSubscriptionStats([FromQuery] int days = 30)
    {
        days = Math.Clamp(days, 1, 365);
        var startDate = DateTime.UtcNow.AddDays(-days);

        // Plan bazlı dağılım
        var planDistribution = await _db.UserSubscriptions
            .Include(s => s.SubscriptionPlan)
            .Where(s => s.IsActive)
            .GroupBy(s => s.SubscriptionPlan!.Name)
            .Select(g => new { Plan = g.Key, Count = g.Count() })
            .ToListAsync();

        // Günlük yeni abonelik
        var dailyNewSubs = await _db.UserSubscriptions
            .Where(s => s.StartDate >= startDate)
            .GroupBy(s => s.StartDate.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        // Süresi dolan abonelikler
        var expiringSubscriptions = await _db.UserSubscriptions
            .Include(s => s.SubscriptionPlan)
            .Where(s => s.IsActive && s.EndDate != null && s.EndDate <= DateTime.UtcNow.AddDays(7))
            .Select(s => new
            {
                s.UserId,
                PlanName = s.SubscriptionPlan!.Name,
                s.EndDate
            })
            .ToListAsync();

        return Ok(new
        {
            planDistribution,
            dailyNewSubs,
            expiringSubscriptions,
            expiringCount = expiringSubscriptions.Count
        });
    }

    // Son abonelikler listesi
    [HttpGet("recent-subscriptions")]
    public async Task<ActionResult> GetRecentSubscriptions([FromQuery] int take = 50)
    {
        take = Math.Clamp(take, 1, 200);

        var subscriptions = await _db.UserSubscriptions
            .Include(s => s.SubscriptionPlan)
            .OrderByDescending(s => s.StartDate)
            .Take(take)
            .Select(s => new RecentSubscriptionDto(
                s.Id,
                s.UserId,
                s.SubscriptionPlan!.Name,
                s.SubscriptionPlan.Price,
                s.StartDate,
                s.EndDate,
                s.IsActive
            ))
            .ToListAsync();

        return Ok(subscriptions);
    }
}

public record PlanRevenueDto(string PlanName, int SubscriptionCount, decimal Revenue);
public record DailyRevenueDto(DateTime Date, int Count, decimal Revenue);
public record RecentSubscriptionDto(int Id, string UserId, string PlanName, decimal Price, DateTime StartDate, DateTime? EndDate, bool IsActive);

