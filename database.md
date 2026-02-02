# Veritabanı Analiz Raporu

## Özet

| Toplam Tablo | Aktif | Kullanılmıyor |
|--------------|-------|---------------|
| 14 | 13 | 1 |

| Toplam Sütun | Aktif | Kullanılmıyor |
|--------------|-------|---------------|
| 97 | 91 | 6 |

---

## Tablolar

### 1. `categories`
Derslerin gruplandığı ana kategorileri tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Kategori kimliği | ✅ |
| name | Kategori adı | ✅ |
| slug | URL kısa ismi | ✅ |
| sort_order | Sıralama numarası | ✅ |
| total_hours | Toplam ders süresi | ✅ |
| created_at | Oluşturulma zamanı | ✅ |

---

### 2. `courses`
Sistemdeki tüm dersleri tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Ders kimliği | ✅ |
| course_slug | URL kısa ismi | ✅ |
| name | Ders adı | ✅ |
| instructor | Eğitmen adı | ✅ |
| category_id | Bağlı kategori | ✅ |
| sort_order | Sıralama numarası | ✅ |
| total_videos | Video sayısı | ✅ |
| total_hours | Toplam süre | ✅ |
| playlist_url | YouTube playlist linki | ✅ |
| created_at | Oluşturulma zamanı | ✅ |

---

### 3. `videos`
Derslerdeki video içeriklerini tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Video kimliği | ✅ |
| video_number | Sıra numarası | ✅ |
| title | Video başlığı | ✅ |
| duration | Süre (metin) | ✅ |
| duration_minutes | Süre (dakika) | ✅ |
| course_id | Bağlı ders | ✅ |
| created_at | Oluşturulma zamanı | ✅ |

---

### 4. `note_chunks`
Ders notlarını parçalara ayırarak saklar. Soru üretimi için kullanılır.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Not parçası kimliği | ✅ |
| course_id | Bağlı ders | ✅ |
| course_name | Ders adı | ✅ |
| section_title | Bölüm başlığı | ✅ |
| content | Not içeriği | ✅ |
| chunk_order | Parça sırası | ✅ |
| word_count | Kelime sayısı | ✅ |
| metadata | Ek bilgiler | ✅ |
| status | Üretim durumu | ✅ |
| is_ready | Soru üretimi tamamlandı mı | ✅ |
| attempts | Deneme sayısı | ✅ |
| error_message | Hata mesajı | ✅ |
| created_at | Oluşturulma zamanı | ✅ |

---

### 5. `questions`
Yapay zeka tarafından üretilen test sorularını tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Soru kimliği | ✅ |
| course_id | Bağlı ders | ✅ |
| chunk_id | Bağlı not parçası | ✅ |
| section_title | Bölüm başlığı | ✅ |
| question_data | Soru içeriği | ✅ |
| usage_type | Soru tipi (antrenman/arşiv/deneme) | ✅ |
| bloom_level | Bilişsel düzey | ✅ |
| parent_question_id | Ana soru (takip için) | ✅ |
| is_global | Herkese açık mı | ✅ |
| quality_score | Kalite puanı | ✅ |
| validation_status | Doğrulama durumu | ✅ |
| validator_feedback | Doğrulayıcı geri bildirimi | ✅ |
| evidence | Kaynak alıntısı | ✅ |
| created_by | Oluşturan kullanıcı | ✅ |
| created_at | Oluşturulma zamanı | ✅ |

---

### 6. `users`
Sistemdeki kullanıcıları tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Kullanıcı kimliği | ✅ |
| email | E-posta | ✅ |
| xp | Deneyim puanı | ✅ |
| title | Unvan | ✅ |
| created_at | Kayıt tarihi | ✅ |
| updated_at | Son güncelleme | ✅ |

---

### 7. `video_progress`
Kullanıcının video izleme durumunu takip eder.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Kayıt kimliği | ✅ |
| user_id | Kullanıcı | ✅ |
| video_id | Video | ✅ |
| completed | Tamamlandı mı | ✅ |
| completed_at | Tamamlanma zamanı | ✅ |
| updated_at | Son güncelleme | ✅ |

---

### 8. `pomodoro_sessions`
Odaklanma sayacı oturumlarını kaydeder.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Oturum kimliği | ✅ |
| user_id | Kullanıcı | ✅ |
| course_id | Çalışılan ders | ✅ |
| course_name | Ders adı | ✅ |
| total_work_time | Çalışma süresi | ✅ |
| total_break_time | Mola süresi | ✅ |
| total_pause_time | Duraklatma süresi | ✅ |
| pause_count | Duraklatma sayısı | ✅ |
| efficiency_score | Verimlilik puanı | ✅ |
| timeline | Zaman çizelgesi | ✅ |
| started_at | Başlangıç | ✅ |
| ended_at | Bitiş | ✅ |
| is_completed | Tamamlandı mı | ✅ |
| last_active_at | Son aktivite | ✅ |
| created_at | Oluşturulma | ✅ |

---

### 9. `user_achievements`
Kullanıcının kazandığı başarı rozetlerini tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| user_id | Kullanıcı | ✅ |
| achievement_id | Başarı kimliği | ✅ |
| unlocked_at | Kazanılma zamanı | ✅ |
| is_celebrated | Kutlama gösterildi mi | ✅ |
| updated_at | Son güncelleme | ✅ |

---

### 10. `subject_guidelines`
Her konu için yapay zekanın nasıl soru üreteceğine dair kuralları tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Kılavuz kimliği | ✅ |
| subject_name | Konu adı | ✅ |
| subject_code | Konu kodu | ✅ |
| instruction | Talimatlar | ✅ |
| few_shot_example | İyi örnek sorular | ✅ |
| bad_few_shot_example | Kötü örnek sorular | ✅ |
| created_at | Oluşturulma | ✅ |
| updated_at | Son güncelleme | ✅ |

---

### 11. `weekly_schedule`
Kullanıcının haftalık çalışma programını tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Program kimliği | ✅ |
| user_id | Kullanıcı | ✅ |
| subject | Konu | ✅ |
| match_days | Çalışma günleri | ✅ |
| created_at | Oluşturulma | ✅ |
| updated_at | Son güncelleme | ✅ |

---

### 12. `chunk_mastery`
Kullanıcının her konuya hakimiyetini takip eder.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Kayıt kimliği | ✅ |
| user_id | Kullanıcı | ✅ |
| chunk_id | Not parçası | ✅ |
| course_id | Ders | ✅ |
| mastery_score | Hakimiyet puanı | ✅ |
| total_questions_seen | Görülen soru sayısı | ✅ |
| last_reviewed_session | Son tekrar oturumu | ✅ |
| created_at | Oluşturulma | ✅ |
| updated_at | Son güncelleme | ✅ |

---

### 13. `user_quiz_progress`
Kullanıcının her soruya verdiği cevabın kaydını tutar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Kayıt kimliği | ✅ |
| user_id | Kullanıcı | ✅ |
| question_id | Soru | ✅ |
| chunk_id | Not parçası | ✅ |
| course_id | Ders | ✅ |
| response_type | Cevap türü | ✅ |
| selected_answer | Seçilen cevap | ✅ |
| was_confident | Zorlandı mı | ✅ |
| session_number | Oturum numarası | ✅ |
| is_review_question | Tekrar sorusu mu | ✅ |
| answered_at | Cevaplama zamanı | ✅ |
| time_spent_ms | Harcanan süre | ✅ |

---

### 14. `course_session_counters`
Her ders için kaç oturum yapıldığını sayar.

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| id | Sayaç kimliği | ✅ |
| user_id | Kullanıcı | ✅ |
| course_id | Ders | ✅ |
| current_session | Mevcut oturum | ✅ |
| last_session_date | Son oturum tarihi | ✅ |
| created_at | Oluşturulma | ✅ |
| updated_at | Son güncelleme | ✅ |

---

### 15. `user_question_status`
Kullanıcının soru durumlarını takip eder (aktif/arşiv/takip bekliyor).

| Sütun | Açıklama | Durum |
|-------|----------|-------|
| question_id | Soru | ✅ |
| user_id | Kullanıcı | ✅ |
| status | Durum | ✅ |
| updated_at | Son güncelleme | ✅ |

---

## Kullanılmayan Tablo

### ❌ `sync_logs`
Senkronizasyon loglarını tutmak için oluşturulmuş ancak hiç kullanılmıyor.

| Sütun | Açıklama |
|-------|----------|
| id | Log kimliği |
| status | Durum |
| started_at | Başlangıç |
| finished_at | Bitiş |
| processed_count | İşlenen |
| skipped_count | Atlanan |
| deleted_count | Silinen |
| error_count | Hata |
| details | Detaylar |

---

## Silinebilecek Sütunlar

| Tablo | Sütun | Neden |
|-------|-------|-------|
| `questions` | `sequence_index` | Kodda kullanılmıyor |
| `users` | `last_synced_at` | Kodda kullanılmıyor |
| `users` | `daily_generation_count` | Kodda kullanılmıyor |
| `users` | `last_generation_date` | Kodda kullanılmıyor |

> [!NOTE]
> Şemadaki `note_chunks.process_at_night` ve `note_chunks.heading_order` sütunları zaten silinmiş görünüyor.

---

## Silme Komutları

```sql
-- Kullanılmayan sütunları sil
ALTER TABLE "public"."questions" DROP COLUMN IF EXISTS "sequence_index";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "last_synced_at";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "daily_generation_count";
ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "last_generation_date";

-- Kullanılmayan tabloyu sil
DROP TABLE IF EXISTS "public"."sync_logs";
```

> [!CAUTION]
> Bu silme işlemlerinden önce mutlaka veritabanı yedeği alın!

---

## Öneriler

1. **`sync_logs` tablosunu silin** - Hiçbir yerde kullanılmıyor.

2. **4 kullanılmayan sütunu temizleyin** - Yukarıda listelenen sütunlar kodda yok.

3. **`note_chunks.course_name` ve `pomodoro_sessions.course_name` sütunlarını değerlendirin** - Bu bilgiler `courses` tablosundan alınabilir. Ancak performans için kasıtlı tutulmuş olabilir.