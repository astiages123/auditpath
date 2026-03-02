-- 1. Kategori Sıralamasını Güncelleme
UPDATE public.categories SET sort_order = 1 WHERE slug = 'HUKUK';
UPDATE public.categories SET sort_order = 2 WHERE slug = 'IKTISAT';
UPDATE public.categories SET sort_order = 3 WHERE slug = 'MUHASEBE_MALIYE';
UPDATE public.categories SET sort_order = 4 WHERE slug = 'GY_GK';
UPDATE public.categories SET sort_order = 5 WHERE slug = 'KAMU_YONETIMI';
UPDATE public.categories SET sort_order = 6 WHERE slug = 'ULUSLARARASI_ILISKILER';
UPDATE public.categories SET sort_order = 7 WHERE slug = 'ATA_584';

-- 2. HUKUK Kategorisi Altındaki Ders Sıralaması
UPDATE public.courses SET sort_order = 1 WHERE course_slug = 'medeni-hukuk';
UPDATE public.courses SET sort_order = 2 WHERE course_slug = 'idare-hukuku';
UPDATE public.courses SET sort_order = 3 WHERE course_slug = 'anayasa-hukuku';
UPDATE public.courses SET sort_order = 4 WHERE course_slug = 'ceza-hukuku';
UPDATE public.courses SET sort_order = 5 WHERE course_slug = 'borclar-hukuku';
UPDATE public.courses SET sort_order = 6 WHERE course_slug = 'ticaret-hukuku';
UPDATE public.courses SET sort_order = 7 WHERE course_slug = 'icra-iflas-hukuku';

-- 3. IKTISAT Kategorisi Altındaki Ders Sıralaması
UPDATE public.courses SET sort_order = 1 WHERE course_slug = 'mikro-iktisat';
UPDATE public.courses SET sort_order = 2 WHERE course_slug = 'makro-iktisat';
UPDATE public.courses SET sort_order = 3 WHERE course_slug = 'para-banka-kredi';
UPDATE public.courses SET sort_order = 4 WHERE course_slug = 'uluslararasi-iktisat';
UPDATE public.courses SET sort_order = 5 WHERE course_slug = 'kalkinma-buyume';
UPDATE public.courses SET sort_order = 6 WHERE course_slug = 'turkiye-ekonomisi';
UPDATE public.courses SET sort_order = 7 WHERE course_slug = 'iktisadi-doktrinler-tarihi';

-- 4. MUHASEBE_MALIYE Kategorisi Altındaki Ders Sıralaması
UPDATE public.courses SET sort_order = 1 WHERE course_slug = 'maliye';
UPDATE public.courses SET sort_order = 2 WHERE course_slug = 'muhasebe';

-- 5. GY_GK Kategorisi Altındaki Ders Sıralaması
UPDATE public.courses SET sort_order = 1 WHERE course_slug = 'matematik-ve-geometri';
UPDATE public.courses SET sort_order = 2 WHERE course_slug = 'tarih';
UPDATE public.courses SET sort_order = 3 WHERE course_slug = 'cografya';
UPDATE public.courses SET sort_order = 4 WHERE course_slug = 'vatandaslik';
UPDATE public.courses SET sort_order = 5 WHERE course_slug = 'sozel-mantik';
UPDATE public.courses SET sort_order = 6 WHERE course_slug = 'ingilizce';

-- 6. KAMU_YONETIMI Kategorisi Altındaki Ders Sıralaması
UPDATE public.courses SET sort_order = 1 WHERE course_slug = 'siyaset-bilimi';
UPDATE public.courses SET sort_order = 2 WHERE course_slug = 'turk-siyasal-hayati';
UPDATE public.courses SET sort_order = 3 WHERE course_slug = 'yerel-yonetimler';
UPDATE public.courses SET sort_order = 4 WHERE course_slug = 'yonetim-bilimi';

-- 7. ULUSLARARASI_ILISKILER Kategorisi Altındaki Ders Sıralaması
UPDATE public.courses SET sort_order = 1 WHERE course_slug = 'uluslararasi-iliskiler-kuramlari';
UPDATE public.courses SET sort_order = 2 WHERE course_slug = 'diplomasi-tarihi';
UPDATE public.courses SET sort_order = 3 WHERE course_slug = 'turk-dis-politikasi';
UPDATE public.courses SET sort_order = 4 WHERE course_slug = 'uluslararasi-hukuk';
UPDATE public.courses SET sort_order = 5 WHERE course_slug = 'uluslararasi-orgutler';

-- 8. ATA_584 Kategorisi Altındaki Ders Sıralaması
UPDATE public.courses SET sort_order = 1 WHERE category_id = (SELECT id FROM public.categories WHERE slug = 'ATA_584');
