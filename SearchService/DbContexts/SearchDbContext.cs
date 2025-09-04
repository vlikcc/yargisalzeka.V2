using Microsoft.EntityFrameworkCore;
using SearchService.Entities;

namespace SearchService.DbContexts;

public class SearchDbContext : DbContext
{
	public SearchDbContext(DbContextOptions<SearchDbContext> options) : base(options)
	{
	}

	public DbSet<Decision> Decisions => Set<Decision>();
	public DbSet<SearchHistory> SearchHistories => Set<SearchHistory>();
	public DbSet<SavedDecision> SavedDecisions => Set<SavedDecision>();

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		modelBuilder.Entity<Decision>(entity =>
		{
			entity.HasKey(d => d.Id);
			entity.ToTable("kararlar");
			entity.Property(d => d.Id).HasColumnName("id");
			entity.Property(d => d.YargitayDairesi).HasColumnName("yargitay_dairesi").HasMaxLength(200);
			entity.Property(d => d.EsasNo).HasColumnName("esas_no").HasMaxLength(100);
			entity.Property(d => d.KararNo).HasColumnName("karar_no").HasMaxLength(100);
			entity.Property(d => d.KararTarihi).HasColumnName("karar_tarihi");
			entity.Property(d => d.KararMetni).HasColumnName("karar_metni").IsRequired();
		});

		modelBuilder.Entity<SearchHistory>(entity =>
		{
			entity.HasKey(x => x.Id);
			entity.ToTable("arama_gecmisi");
			entity.Property(x => x.Id).HasColumnName("id");
			entity.Property(x => x.UserId).HasColumnName("kullanici_id").HasMaxLength(100).IsRequired();
			entity.Property(x => x.Keywords).HasColumnName("anahtar_kelimeler").HasMaxLength(1000).IsRequired();
			entity.Property(x => x.ResultCount).HasColumnName("sonuc_sayisi");
			entity.Property(x => x.CreatedAt).HasColumnName("olusturma_zamani");
			entity.HasIndex(x => x.UserId);
		});

		modelBuilder.Entity<SavedDecision>(entity =>
		{
			entity.HasKey(x => x.Id);
			entity.ToTable("kayitli_kararlar");
			entity.Property(x => x.Id).HasColumnName("id");
			entity.Property(x => x.UserId).HasColumnName("kullanici_id").HasMaxLength(100).IsRequired();
			entity.Property(x => x.DecisionId).HasColumnName("karar_id").IsRequired();
			entity.Property(x => x.SavedAt).HasColumnName("kayit_zamani");
			entity.HasIndex(x => new { x.UserId, x.DecisionId }).IsUnique();
			entity.HasOne(x => x.Decision)
				.WithMany()
				.HasForeignKey(x => x.DecisionId)
				.OnDelete(DeleteBehavior.Cascade);
		});
	}
}


