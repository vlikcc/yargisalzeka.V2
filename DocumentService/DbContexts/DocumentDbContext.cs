using DocumentService.Entities;
using Microsoft.EntityFrameworkCore;

namespace DocumentService.DbContexts;

public class DocumentDbContext : DbContext
{
    public DocumentDbContext(DbContextOptions<DocumentDbContext> options) : base(options) { }

    public DbSet<PetitionDocument> PetitionDocuments => Set<PetitionDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PetitionDocument>(e =>
        {
            e.ToTable("dilekceler");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("kullanici_id").HasMaxLength(100).IsRequired();
            e.Property(x => x.Topic).HasColumnName("konu").HasMaxLength(300).IsRequired();
            e.Property(x => x.CaseText).HasColumnName("olay_metin").IsRequired();
            e.Property(x => x.DecisionsJson).HasColumnName("emsal_kararlar_json");
            e.Property(x => x.Content).HasColumnName("icerik").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("olusturma_zamani");
            e.HasIndex(x => x.UserId);
        });
    }
}
