-- Adalet Bakanlığı Mevzuat Bilgi Sistemi - Veritabanı Şeması
-- Bu script, mevzuat ve içtihat verilerini saklamak için gerekli tabloları oluşturur.

-- ============================================================
-- MEVZUAT TABLOLARI
-- ============================================================

-- Ana mevzuat tablosu
CREATE TABLE IF NOT EXISTS mevzuatlar (
    id SERIAL PRIMARY KEY,
    mevzuat_id VARCHAR(50) UNIQUE NOT NULL,
    mevzuat_no INTEGER,
    mevzuat_adi TEXT NOT NULL,
    mevzuat_tur VARCHAR(50),
    mevzuat_tur_adi VARCHAR(200),
    mevzuat_tertip INTEGER,
    kayit_tarihi TIMESTAMP,
    guncelleme_tarihi TIMESTAMP,
    resmi_gazete_tarihi DATE,
    resmi_gazete_sayisi VARCHAR(50),
    url TEXT,
    icerik TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mevzuat indeksleri
CREATE INDEX IF NOT EXISTS idx_mevzuatlar_tur ON mevzuatlar(mevzuat_tur);
CREATE INDEX IF NOT EXISTS idx_mevzuatlar_no ON mevzuatlar(mevzuat_no);
CREATE INDEX IF NOT EXISTS idx_mevzuatlar_tarih ON mevzuatlar(resmi_gazete_tarihi);

-- Mevzuat full-text search indeksleri
CREATE INDEX IF NOT EXISTS idx_mevzuatlar_adi_gin ON mevzuatlar 
    USING gin(to_tsvector('turkish', mevzuat_adi));
CREATE INDEX IF NOT EXISTS idx_mevzuatlar_icerik_gin ON mevzuatlar 
    USING gin(to_tsvector('turkish', COALESCE(icerik, '')));

-- Mevzuat türleri referans tablosu
CREATE TABLE IF NOT EXISTS mevzuat_turleri (
    id SERIAL PRIMARY KEY,
    kod VARCHAR(50) UNIQUE NOT NULL,
    adi VARCHAR(200) NOT NULL,
    aciklama TEXT,
    aktif BOOLEAN DEFAULT TRUE
);

-- Mevzuat türlerini ekle
INSERT INTO mevzuat_turleri (kod, adi) VALUES
    ('KANUN', 'Kanunlar'),
    ('CB_KARARNAME', 'Cumhurbaşkanı Kararnameleri'),
    ('YONETMELIK', 'Bakanlar Kurulu Yönetmelikleri'),
    ('CB_YONETMELIK', 'Cumhurbaşkanlığı Yönetmelikleri'),
    ('CB_KARAR', 'Cumhurbaşkanı Kararları'),
    ('CB_GENELGE', 'Cumhurbaşkanlığı Genelgeleri'),
    ('KHK', 'Kanun Hükmünde Kararnameler'),
    ('TUZUK', 'Tüzükler'),
    ('KKY', 'Kurum ve Kuruluş Yönetmelikleri'),
    ('UY', 'Üniversite Yönetmelikleri'),
    ('TEBLIGLER', 'Tebliğler'),
    ('MULGA', 'Mülga Mevzuat')
ON CONFLICT (kod) DO NOTHING;

-- ============================================================
-- İÇTİHAT TABLOLARI
-- ============================================================

-- Ana içtihat tablosu
CREATE TABLE IF NOT EXISTS ictihatlar (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(50) UNIQUE NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_type_adi VARCHAR(200),
    birim_id VARCHAR(50),
    birim_adi VARCHAR(200),
    esas_no_yil INTEGER,
    esas_no_sira INTEGER,
    karar_no_yil INTEGER,
    karar_no_sira INTEGER,
    esas_no VARCHAR(50),
    karar_no VARCHAR(50),
    karar_turu VARCHAR(100),
    karar_tarihi DATE,
    karar_tarihi_str VARCHAR(20),
    kesinlesme_durumu VARCHAR(50),
    karar_metni TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İçtihat indeksleri
CREATE INDEX IF NOT EXISTS idx_ictihatlar_type ON ictihatlar(item_type);
CREATE INDEX IF NOT EXISTS idx_ictihatlar_birim ON ictihatlar(birim_adi);
CREATE INDEX IF NOT EXISTS idx_ictihatlar_esas ON ictihatlar(esas_no_yil, esas_no_sira);
CREATE INDEX IF NOT EXISTS idx_ictihatlar_karar ON ictihatlar(karar_no_yil, karar_no_sira);
CREATE INDEX IF NOT EXISTS idx_ictihatlar_tarih ON ictihatlar(karar_tarihi);

-- İçtihat full-text search indeksi
CREATE INDEX IF NOT EXISTS idx_ictihatlar_metin_gin ON ictihatlar 
    USING gin(to_tsvector('turkish', COALESCE(karar_metni, '')));

-- İçtihat türleri referans tablosu
CREATE TABLE IF NOT EXISTS ictihat_turleri (
    id SERIAL PRIMARY KEY,
    kod VARCHAR(50) UNIQUE NOT NULL,
    adi VARCHAR(200) NOT NULL,
    aciklama TEXT,
    aktif BOOLEAN DEFAULT TRUE
);

-- İçtihat türlerini ekle
INSERT INTO ictihat_turleri (kod, adi) VALUES
    ('YARGITAYKARARI', 'Yargıtay Kararı'),
    ('DANISTAYKARAR', 'Danıştay Kararı'),
    ('YERELHUKUK', 'Yerel Hukuk Mahkemesi Kararı'),
    ('ISTINAFHUKUK', 'İstinaf Hukuk Mahkemesi Kararı'),
    ('KYB', 'Kanun Yararına Bozma Kararları')
ON CONFLICT (kod) DO NOTHING;

-- ============================================================
-- UYUMLULUK VIEW'LARI
-- ============================================================

-- Mevcut kararlar tablosuyla uyumluluk için view
CREATE OR REPLACE VIEW kararlar_view AS
SELECT 
    id,
    birim_adi as yargitay_dairesi,
    esas_no,
    karar_no,
    karar_tarihi,
    karar_metni
FROM ictihatlar
WHERE item_type = 'YARGITAYKARARI';

-- ============================================================
-- İSTATİSTİK FONKSİYONLARI
-- ============================================================

-- Mevzuat istatistikleri
CREATE OR REPLACE FUNCTION get_mevzuat_stats()
RETURNS TABLE (
    tur VARCHAR(50),
    tur_adi VARCHAR(200),
    kayit_sayisi BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.mevzuat_tur,
        COALESCE(mt.adi, m.mevzuat_tur_adi) as tur_adi,
        COUNT(*) as kayit_sayisi
    FROM mevzuatlar m
    LEFT JOIN mevzuat_turleri mt ON m.mevzuat_tur = mt.kod
    GROUP BY m.mevzuat_tur, mt.adi, m.mevzuat_tur_adi
    ORDER BY kayit_sayisi DESC;
END;
$$ LANGUAGE plpgsql;

-- İçtihat istatistikleri
CREATE OR REPLACE FUNCTION get_ictihat_stats()
RETURNS TABLE (
    tur VARCHAR(50),
    tur_adi VARCHAR(200),
    kayit_sayisi BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.item_type,
        COALESCE(it.adi, i.item_type_adi) as tur_adi,
        COUNT(*) as kayit_sayisi
    FROM ictihatlar i
    LEFT JOIN ictihat_turleri it ON i.item_type = it.kod
    GROUP BY i.item_type, it.adi, i.item_type_adi
    ORDER BY kayit_sayisi DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GÜNCELLEME TRİGGER'LARI
-- ============================================================

-- updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mevzuatlar için trigger
DROP TRIGGER IF EXISTS update_mevzuatlar_updated_at ON mevzuatlar;
CREATE TRIGGER update_mevzuatlar_updated_at
    BEFORE UPDATE ON mevzuatlar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- İçtihatlar için trigger
DROP TRIGGER IF EXISTS update_ictihatlar_updated_at ON ictihatlar;
CREATE TRIGGER update_ictihatlar_updated_at
    BEFORE UPDATE ON ictihatlar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- YARDIMCI FONKSİYONLAR
-- ============================================================

-- Mevzuat arama fonksiyonu
CREATE OR REPLACE FUNCTION search_mevzuat(
    arama_metni TEXT,
    mevzuat_turu VARCHAR(50) DEFAULT NULL,
    sayfa INTEGER DEFAULT 1,
    sayfa_boyutu INTEGER DEFAULT 20
)
RETURNS TABLE (
    id INTEGER,
    mevzuat_id VARCHAR(50),
    mevzuat_no INTEGER,
    mevzuat_adi TEXT,
    mevzuat_tur VARCHAR(50),
    resmi_gazete_tarihi DATE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.mevzuat_id,
        m.mevzuat_no,
        m.mevzuat_adi,
        m.mevzuat_tur,
        m.resmi_gazete_tarihi,
        ts_rank(
            to_tsvector('turkish', m.mevzuat_adi || ' ' || COALESCE(m.icerik, '')),
            plainto_tsquery('turkish', arama_metni)
        ) as rank
    FROM mevzuatlar m
    WHERE 
        (mevzuat_turu IS NULL OR m.mevzuat_tur = mevzuat_turu)
        AND (
            to_tsvector('turkish', m.mevzuat_adi || ' ' || COALESCE(m.icerik, '')) 
            @@ plainto_tsquery('turkish', arama_metni)
        )
    ORDER BY rank DESC
    LIMIT sayfa_boyutu
    OFFSET (sayfa - 1) * sayfa_boyutu;
END;
$$ LANGUAGE plpgsql;

-- İçtihat arama fonksiyonu
CREATE OR REPLACE FUNCTION search_ictihat(
    arama_metni TEXT,
    ictihat_turu VARCHAR(50) DEFAULT NULL,
    birim VARCHAR(200) DEFAULT NULL,
    sayfa INTEGER DEFAULT 1,
    sayfa_boyutu INTEGER DEFAULT 20
)
RETURNS TABLE (
    id INTEGER,
    document_id VARCHAR(50),
    item_type VARCHAR(50),
    birim_adi VARCHAR(200),
    esas_no VARCHAR(50),
    karar_no VARCHAR(50),
    karar_tarihi DATE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.document_id,
        i.item_type,
        i.birim_adi,
        i.esas_no,
        i.karar_no,
        i.karar_tarihi,
        ts_rank(
            to_tsvector('turkish', COALESCE(i.karar_metni, '')),
            plainto_tsquery('turkish', arama_metni)
        ) as rank
    FROM ictihatlar i
    WHERE 
        (ictihat_turu IS NULL OR i.item_type = ictihat_turu)
        AND (birim IS NULL OR i.birim_adi ILIKE '%' || birim || '%')
        AND (
            to_tsvector('turkish', COALESCE(i.karar_metni, '')) 
            @@ plainto_tsquery('turkish', arama_metni)
        )
    ORDER BY rank DESC, i.karar_tarihi DESC
    LIMIT sayfa_boyutu
    OFFSET (sayfa - 1) * sayfa_boyutu;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TAMAMLANDI
-- ============================================================

-- Şema versiyonu
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES
    (1, 'Initial schema for mevzuat and ictihat tables')
ON CONFLICT (version) DO NOTHING;

-- Sonuç
SELECT 'Veritabanı şeması başarıyla oluşturuldu!' as message;
