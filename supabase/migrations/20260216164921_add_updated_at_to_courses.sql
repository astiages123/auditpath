-- courses tablosuna updated_at ekleme ve trigger oluşturma
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- update_updated_at fonksiyonunu oluştur (veya güncelle)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = NOW(); 
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur (mevcutsa önce sil)
DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();
