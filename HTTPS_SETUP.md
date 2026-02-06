# Frontend Mixed Content Hatası - HTTPS Çözümü

## 🔴 Hata

```
Mixed Content: HTTPS sayfası HTTP API çağırıyor
Frontend: https://backendbg.ozdinar.live/
Backend API: http://backendbg.ozdinar.live:3001/
```

Tarayıcı bu durumu güvenlik riski olarak engelliyor.

---

## ✅ Çözüm: Backend'e Domain ve HTTPS Ekleyin

### Coolify'da Backend Ayarları

1. **Coolify → Projects → Backend Container**'a gidin

2. **"Domains"** veya **"Configuration"** sekmesinde:
   - **Domain** ekleyin: `api.ozdinar.live` (veya istediğiniz subdomain)
   - Coolify otomatik olarak HTTPS sertifikası (Let's Encrypt) yükler

3. **Port Mapping'i Kaldırın:**
   - Backend için manuel port (3001) tanımlandıysa kaldırın
   - Coolify reverse proxy ile yönetsin

4. **Kaydet ve Redeploy**

---

### Frontend API URL'ini Güncelleyin

Backend artık **HTTPS domain** ile erişilebilir olacak:

**Coolify'da Frontend environment variables:**
```env
API_URL=https://api.ozdinar.live
```

(veya backend'e hangi domain verdiyseniz o)

---

## 📋 Adım Adım

### 1. Backend'e Domain Ekleyin

Coolify'da:
- Backend service → **Domains** kısmına gidin
- Domain ekleyin: `api.ozdinar.live`
- Port mapping varsa kaldırın (Coolify reverse proxy kullanacak)
- **Save**

### 2. DNS Ayarları (Domain Provider)

Domain provider'ınızda (CloudFlare, Namecheap vs.):
```
Type: A Record
Name: api
Value: [Coolify server IP]
```

### 3. Frontend Environment Variable

Coolify'da frontend'in environment variables:
```env
API_URL=https://api.ozdinar.live
```

### 4. Redeploy

Hem backend hem frontend'i redeploy edin.

---

## 🎯 Sonuç

✅ Frontend: `https://backendbg.ozdinar.live/` (zaten var)  
✅ Backend: `https://api.ozdinar.live` (eklenecek)  
✅ Mixed content hatası çözülecek  

---

## 🔧 Alternatif: Aynı Domain Kullanın

Eğer subdomain kullanmak istemiyorsanız:

**Option 1:** Backend'i path ile sunun  
- Frontend: `https://backendbg.ozdinar.live/`
- Backend: `https://backendbg.ozdinar.live/api`

**Option 2:** Backend'i aynı domain'de farklı path'te reverse proxy ile yönlendirin (Coolify'da biraz daha karmaşık)

**ÖNERİ:** En kolay yöntem subdomain: `api.ozdinar.live`
