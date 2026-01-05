using IdentityService.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.DbContexts
{
    public class IdentitiyDbContext:IdentityDbContext<ApplicationUser>
    {
        public IdentitiyDbContext(DbContextOptions<IdentitiyDbContext> options) : base(options)
        {
        }

        public DbSet<LoginLog> LoginLogs { get; set; } = null!;
        public DbSet<Announcement> Announcements { get; set; } = null!;
        public DbSet<UserSession> UserSessions { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            builder.Entity<LoginLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.Email);
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => e.IsSuccess);
            });

            builder.Entity<Announcement>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.IsActive);
                entity.HasIndex(e => e.CreatedAt);
            });

            builder.Entity<UserSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsActive);
            });
        }
    }   
   
}
