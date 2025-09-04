using Microsoft.AspNetCore.Identity;

namespace IdentityService.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }
        public bool IsActive { get; set; } = true;
        public string Role { get; set; } = "User"; // User, Admin, SuperAdmin
        public DateTime? SubscriptionEndDate { get; set; }
    }
}
