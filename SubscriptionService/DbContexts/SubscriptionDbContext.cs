using Microsoft.EntityFrameworkCore;

namespace SubscriptionService;

public class SubscriptionDbContext : DbContext
{
    public SubscriptionDbContext(DbContextOptions<SubscriptionDbContext> options) : base(options) { }

    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UsageTracking> UsageTrackings => Set<UsageTracking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SubscriptionPlan>().HasData(
            new SubscriptionPlan { Id = 1, Name = "Trial", Price = 0m, ValidityDays = 3, KeywordExtractionLimit = -1, CaseAnalysisLimit = 5, SearchLimit = 5, PetitionLimit = 1 },
            new SubscriptionPlan { Id = 2, Name = "Temel", Price = 199m, ValidityDays = null, KeywordExtractionLimit = -1, CaseAnalysisLimit = 5, SearchLimit = 5, PetitionLimit = 0 },
            new SubscriptionPlan { Id = 3, Name = "Standart", Price = 499m, ValidityDays = null, KeywordExtractionLimit = -1, CaseAnalysisLimit = 50, SearchLimit = 250, PetitionLimit = 10 },
            new SubscriptionPlan { Id = 4, Name = "Premium", Price = 999m, ValidityDays = null, KeywordExtractionLimit = -1, CaseAnalysisLimit = -1, SearchLimit = -1, PetitionLimit = -1 }
        );

        modelBuilder.Entity<UserSubscription>()
            .HasOne(us => us.SubscriptionPlan)
            .WithMany(p => p.UserSubscriptions)
            .HasForeignKey(us => us.SubscriptionPlanId);

        modelBuilder.Entity<UsageTracking>()
            .HasOne(u => u.UserSubscription)
            .WithMany(s => s.UsageTrackings)
            .HasForeignKey(u => u.UserSubscriptionId);
    }
}
