# 🔐 [Auth] Modülü Teknik Dökümantasyonu

Bu modül, projenin "kapalı devre" yapısını korumak, kullanıcı oturumlarını stabilize etmek ve giriş süreçlerini valide etmek amacıyla modernize edilmiştir.

## 🏗 Mimari Yapı

Auth sistemi, **Feature-based Architecture** prensiplerine uygun olarak `src/features/auth` altında toplanmıştır. **Singleton** bir Supabase istemcisi üzerinden beslenir ve **React Context API** ile uygulama geneline yayılır.

### Temel Bileşenler

| Bileşen | Görev | Teknoloji |
| --- | --- | --- |
| **AuthProvider** | Oturum durumunu (User, Session, Loading) yönetir ve tüm uygulamaya servis eder. | Context API, Supabase Auth |
| **useAuth** | Auth state'ine erişim sağlayan özel hook (Custom Hook). | React useContext |
| **AuthGuard** | Yetkisiz erişimleri engeller ve kullanıcıyı giriş formuna yönlendirir. | Higher-Order Component (HOC) |
| **AuthForms** | Giriş formunu, validasyonları ve RPC çağrılarını yönetir. | Zod, React Hook Form |

---

## 🚀 Öne Çıkan Optimizasyonlar

### 1. Flicker (Ekran Kırpılması) Önleme

Oturum açılışında yaşanan anlık "Giriş Yap" ekranı görünmesi sorunu, `AuthProvider` içine eklenen **Initialization Logic** ile çözülmüştür.

* **Mekanizma:** `loading` durumu, Supabase'den ilk `getSession` yanıtı gelene kadar `true` tutulur.
* **Stabilite:** `mounted` flag kontrolü sayesinde, asenkron işlem bitmeden bileşen unmount olursa oluşabilecek "memory leak" hataları engellenmiştir.

### 2. Akıllı Validasyon (Smart Login)

Kullanıcı deneyimini artırmak için `identifier` alanı çift yönlü çalışır:

* **E-posta:** Standart regex kontrolünden geçer.
* **Kullanıcı Adı:** Eğer giriş bir e-posta değilse, Zod şeması en az 3 karakter zorunluluğu getirir ve arka planda `get_email_by_username` RPC fonksiyonu çalıştırılarak kullanıcının e-postası bulunur.

> [!NOTE]
> **Güvenlik Notu:** Kayıt (Sign Up) özelliği bilerek devre dışı bırakılmıştır. Yeni kullanıcılar doğrudan veritabanı seviyesinde veya Supabase Dashboard üzerinden tanımlanmalıdır.

---

## 🛠 Teknik Detaylar (Referans)

**Zod Validasyon Şeması:**

```typescript
const authSchema = z.object({
  identifier: z.string().min(1, "Zorunlu").refine((val) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    return isEmail || val.length >= 3;
  }),
  password: z.string().min(6)
});

```

**Oturum Dinleyicisi:**
`onAuthStateChange` kullanılarak sekmeler arası oturum senkronizasyonu ve token yenileme süreçleri otomatik olarak yönetilmektedir.