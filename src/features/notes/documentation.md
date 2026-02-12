# Notes Feature Dokümantasyonu

## Genel Bakış

Notes Feature, kurs içeriklerini zengin markdown formatında sunan, etkileşimli ve güvenli bir belge okuma sistemidir. Bu feature, matematik formülleri, diyagramlar, kod blokları ve navigasyon özellikleri ile akademik içerikleri görselleştirir.

**Sağladığı Değerler:**

- Zengin markdown render: Matematik, tablolar, kod, diyagramlar
- İnteraktif navigasyon: Global sidebar ve lokal içindekiler
- Güvenlik: DOMPurify ile XSS koruması
- Erişilebilirlik: KaTeX desteği, responsive tasarım

## Mimari Yapı

```
src/features/notes/
├── components/
│   ├── MarkdownRenderer/
│   │   ├── CodeBlock.tsx           # Kod blokları (KaTeX matematik & Mermaid desteği)
│   │   ├── MarkdownComponents.tsx  # Özel MD bileşenleri (başlıklar, tablolar, görseller)
│   │   ├── MarkdownSection.tsx     # Ana markdown render bölümü
│   │   ├── MermaidDiagram.tsx      # Mermaid diyagram render bileşeni
│   │   └── index.ts                # Barrel export
│   ├── GlobalNavigation.tsx        # Sol sidebar navigasyon (konu listesi)
│   ├── LocalToC.tsx                # Sağ sidebar lokal içindekiler
│   ├── TableOfContents.tsx         # Miras/kullanılabilir ToC bileşeni
│   └── ToCTitleRenderer.tsx        # KaTeX destekli ToC başlık render'ı
├── hooks/
│   ├── useNotesNavigation.ts       # Kaydırma ilerlemesi, pozisyon kaydetme, navigasyon
│   └── useTableOfContents.ts       # ToC öğeleri oluşturma, aktif bölüm takibi
├── lib/
│   └── notes.ts                    # Not getirme servisi (yerel dosyalar)
├── NotesPage.tsx                   # 3 panel düzeni ile ana sayfa
└── index.ts                        # Feature barrel export
```

### Ana Bileşenlerin Sorumlulukları

**NotesPage (NotesPage.tsx)**

- 3 panel ana düzeni: Sol global navigasyon, orta içerik, sağ lokal ToC
- Kurs konularını getirir ve önbelleğe alır
- URL'deki `topicSlug`'a göre aktif chunk'ı belirler
- localStorage'da scroll pozisyonunu kaydeder/geriyükler

**GlobalNavigation (components/GlobalNavigation.tsx)**

- Tüm kurs konularını (chunk'ları) listeler
- React Router `<Link>` kullanır
- Aktif durumu görsel gösterge ile belirtir
- Aktif öğeyi görünür alana otomatik kaydırır
- URL formatı: `/notes/:courseSlug/:topicSlug`

**MarkdownSection (components/MarkdownRenderer/MarkdownSection.tsx)**

- `ReactMarkdown` kullanarak markdown render eder
- Tailwind prose sınıfları ile `<article>` içine alır
- Her bölüme `slugify(chunk.section_title)` ile benzersiz ID atar

**LocalToC (components/LocalToC.tsx)**

- Mevcut chunk içindeki başlıkları gösterir
- Hiyerarşik girinti (Seviye 2, 3, 4)
- Aktif bölüm birincil renkle vurgulanır
- Tıklama 100px offset ile bölüme kaydırır

## Teknik Detaylar (Core Logic)

### Markdown Render Süreci

Markdown render çok katmanlı bir mimari izler:

**Giriş Noktası: `MarkdownSection.tsx`**

- `react-markdown` kütüphanesinden `ReactMarkdown` kullanır
- İçeriği Tailwind prose sınıfları ile `<article>` içine alır
- Her bölüme `slugify(chunk.section_title)` ile benzersiz ID verilir

**Kullanılan Plugin'ler:**
| Plugin | Amaç |
|--------|------|
| `remarkMath` | Matematik sözdizimini ayrıştırır ($...$ ve $$...$$) |
| `remarkGfm` | GitHub Flavored Markdown (tablolar, üstü çizili, vb.) |
| `rehypeKatex` | KaTeX kullanarak matematik render eder |
| `rehypeRaw` | Markdown'da ham HTML'ye izin verir |

**Özel Bileşenler: `MarkdownComponents.tsx`**

- **h1/h2/h3**: h3/h4/h5'e eşlenir, scroll-margin ve ID oluşturma
- **p**: Geçersiz DOM iç içe geçmesini önlemek için görsel alt öğeleri tespit eder
- **img**: Tıklama ile yakınlaştırma için `react-medium-image-zoom` ile sarmalanır
- **blockquote**: 💡 emoji ile "callout" stilini destekler
- **table/thead/th/tr/td**: Özel CSS sınıfları ile stillendirilir
- **code**: `CodeBlock` bileşenine devredilir
- **div**: KaTeX display düzeltmesi için işler

### MermaidDiagram Entegrasyonu

**Konum:** `/Users/vedatdiyar/Desktop/AuditPath/src/features/notes/components/MarkdownRenderer/MermaidDiagram.tsx`

**Başlatma:**

```typescript
mermaid.initialize({
  startOnLoad: false, // Manuel render
  theme: 'dark', // Koyu tema
  themeVariables: {
    // Özel renk şeması
    primaryColor: '#f59e0b',
    primaryTextColor: '#fff',
    lineColor: '#888',
    fontFamily: 'Poppins, system-ui, sans-serif',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
  },
});
```

**Entegrasyon Akışı:**

1. `CodeBlock.tsx` `language-mermaid` kod bloklarını tespit eder
2. Kodu `MermaidDiagram` bileşenine iletir
3. Mermaid benzersiz ID ile SVG render eder
4. SVG, `dangerouslySetInnerHTML` ile enjekte edilmeden önce **sanitize** edilir
5. Render sırasında yükleme dönen animasyonu gösterir, hata durumunda hata gösterir

**Güvenlik Notu:** Tüm render edilen SVG'ler enjeksiyondan önce `sanitizeHtml()`'den geçer.

### TableOfContents ve Navigasyon Mantığı

Sistem **çift navigasyon** yaklaşımı kullanır:

#### Global Navigasyon (Sol Panel)

**Dosya:** `GlobalNavigation.tsx`

- Tüm kurs konularını (chunk'ları) listeler
- React Router'ın `<Link>`'ini kullanır
- Aktif durumu görsel gösterge ile gösterir
- Aktif öğeyi görünür alana otomatik kaydırır
- URL formatı: `/notes/:courseSlug/:topicSlug`

#### Lokal ToC (Sağ Panel)

**Dosya:** `LocalToC.tsx`

- **Şu an aktif** chunk içindeki başlıkları gösterir
- Hiyerarşik girinti (Seviye 2, 3, 4)
- Aktif bölüm birincil renkle vurgulanır
- Tıklama 100px offset ile bölüme kaydırır

#### ToC Oluşturma Mantığı (`useTableOfContents.ts`)

```typescript
// Markdown içeriğini satır satır ayrıştırır
/^#\s+(.+)$/   // H1 -> Seviye 2
/^##\s+(.+)$/  // H2 -> Seviye 3
/^###\s+(.+)$/ // H3 -> Seviye 4
```

#### Aktif Bölüm Takibi

`IntersectionObserver` kullanır:

- Root: Ana içerik konteyneri
- Root margin: `-10% 0% -80% 0%`
- Eşik: 0
- Programatik kaydırmaları `isProgrammaticScroll` ref'i ile filtreler

#### Kaydırma Davranışı

**`useNotesNavigation.ts` sağlar:**

- Kaydırma ilerlemesi takibi
- localStorage'a kaydırma pozisyonu kaydetme
- Sayfa yüklemesinde kaydırma pozisyonu geriyükleme
- Belirli ID'lere yumuşak kaydırma
- En üste kaydırma işlevselliği

### Güvenlik Katmanı (sanitizeHtml)

**Konum:** `/Users/vedatdiyar/Desktop/AuditPath/src/shared/utils/sanitizeHtml.ts`

**Teknoloji:** DOMPurify

**Yapılandırma:**

```typescript
USE_PROFILES: { html: true, svg: true, mathMl: true }
```

**İzin Verilen Etiketler (ADD_TAGS):**

- SVG elemanları: `use`, `foreignObject`
- Düzen: `div`, `span`, `br`, `p`
- MathML: `math`, `semantics`, `mrow`, `msup`, `msub`, vb.

**İzin Verilen Özellikler (ADD_ATTR):**

- SVG özellikleri: `cx`, `cy`, `r`, `fill`, `stroke`, `viewBox`, `d`, `points`
- MathML özellikleri: `x`, `y`, `transform`
- Erişilebilirlik: `role`, `aria-hidden`
- Stil: `class`, `style`, `id`

**Yasak Etiketler:**
`script`, `style`, `iframe`, `form`, `input`, `textarea`, `object`, `embed`, `link`

**Yasak Özellikler:**
Tüm olay işleyicileri: `onerror`, `onload`, `onclick`, `onmouseover`, vb.

**Kullanım Noktaları:**

1. `CodeBlock.tsx` - KaTeX HTML çıktısını sanitize eder
2. `MermaidDiagram.tsx` - Render edilen SVG'yi sanitize eder

## Veri Akışı

### Matematik Render (KaTeX)

- Inline matematik: `$...$` veya `\(...\)`
- Display matematik: `$$...$$` veya `\[...\]`
- KaTeX CSS global olarak import edilir
- Render hatalarında null döndürülür

### Görsel İşleme

- `[GÖRSEL: N]` işaretçilerini markdown'da destekler
- Görsel işaretçileri metadata'dan gerçek URL'lerle değiştirilir
- Kullanılmayan görseller içeriğin sonuna eklenir
- `react-medium-image-zoom` ile tıklama ile yakınlaştırma

### Veri Akışı

1. `NotesPage.tsx` `getCourseTopics()`'ten `CourseTopic[]` getirir
2. İçeriği işler (görsel işaretçiler, Unicode temizleme)
3. localStorage'da önbelleğe alır
4. Engelleme olmayan state güncellemeleri için `useTransition` kullanır
5. URL `topicSlug`'ına göre sadece aktif chunk'ı render eder

### URL Yönlendirme

- `/notes/:courseSlug` -> İlk konuya yönlendirir
- `/notes/:courseSlug/:topicSlug` -> Belirli konu

### Callout Blokları

💡 ile başlayan blockquote'lar stilize callout kutuları olarak render edilir:

- İkon: 💡
- Etiket: "İNCELEME / ÖRNEK"
- İlk ampul emojisi içerikten kaldırılır

### Kod Blokları

- Dil etiketi ile sözdizimi vurgulama
- Görsel geri bildirimli kopyalama butonu
- Renkli noktalarla terminal stili başlık
- Koyu tema arka plan (`#0d1117`)

## Bağımlılık Özeti

- `react-markdown` - Temel markdown render
- `remark-math`, `rehype-katex` - Matematik desteği
- `remark-gfm` - GitHub Flavored Markdown
- `katex` - Matematik formül render
- `mermaid` - Diyagram oluşturma
- `dompurify` - XSS koruması
- `react-medium-image-zoom` - Görsel yakınlaştırma
- `lucide-react` - İkonlar

## Supabase ile Etkileşim

**Veri Tabloları:**

- `course_topics`: Kurs konuları ve markdown içeriği
- `courses`: Kurs metadata'sı
- `note_images`: Görsel URL'leri ve işaretçiler

**State Yönetimi:**

- NotesPage: Aktif konu ve içerik durumu
- useNotesNavigation: Kaydırma pozisyonu ve ilerleme
- localStorage: Konu önbelleği ve scroll pozisyonu
- React Router: URL parametreleri (courseSlug, topicSlug)
