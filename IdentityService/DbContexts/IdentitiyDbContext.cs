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
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            // Additional model configurations can be added here
        }
    }   
   
}
