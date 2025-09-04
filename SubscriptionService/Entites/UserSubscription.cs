namespace SubscriptionService;

public class UserSubscription
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty; // IdentityService user id
    public int SubscriptionPlanId { get; set; }
    public SubscriptionPlan? SubscriptionPlan { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Convenience - not persisted summary fields (optional)
    public ICollection<UsageTracking> UsageTrackings { get; set; } = new List<UsageTracking>();
}

public class SubscriptionPlan
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // Trial, Temel, Standart, Premium
    public decimal Price { get; set; }
    public int? ValidityDays { get; set; } // null = unlimited
    public int KeywordExtractionLimit { get; set; } = -1;
    public int CaseAnalysisLimit { get; set; }
    public int SearchLimit { get; set; }
    public int PetitionLimit { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserSubscription> UserSubscriptions { get; set; } = new List<UserSubscription>();
}

public class UsageTracking
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int UserSubscriptionId { get; set; }
    public UserSubscription? UserSubscription { get; set; }
    public string FeatureType { get; set; } = string.Empty; // KeywordExtraction, CaseAnalysis, Search, Petition
    public int UsedCount { get; set; }
    public DateTime? LastUsed { get; set; }
    public DateTime ResetDate { get; set; } = DateTime.UtcNow; // monthly reset baseline
}
