# CORS Hata Giderme Checklist

## ✅ Yapılanlar
- [x] Backend CORS konfigürasyonu eklendi
- [x] ALLOWED_ORIGINS environment variable ayarlandı
- [x] Kod GitHub'a push edildi
- [x] Deployment başarılı

## 🔴 Hata Devam Ediyor

Console:
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

---

## 🧪 Test Adımları

### 1. **Hard Refresh / Incognito**
- Ctrl + Shift + R ile sayfayı yenileyin
- VEYA Incognito/Private window'da açın
- Hata devam ediyor mu?

### 2. **Backend CORS Header Kontrolü**

Browser DevTools → Network sekmesi:
- `/api/address/provinces` isteğine tıklayın
- **Response Headers** bölümüne bakın
- `Access-Control-Allow-Origin` header var mı?
  - **Varsa** ne yazıyor?
  - **Yoksa** backend CORS çalışmıyor

### 3. **Backend Logs Kontrolü**

Coolify → Backend container → **Logs**:
- CORS ile ilgili hata var mı?
- Server başlarken `ALLOWED_ORIGINS` loglanıyor mu?

### 4. **Test: Wildcard CORS**

Backend environment variables:
```env
ALLOWED_ORIGINS=*
```
Geçici olarak `*` yapıp redeploy edin.
- Çalışırsa → Specific origin sorunu
- Çalışmazsa → Başka bir sorun

---

## 🔧 Muhtemel Çözümler

### Çözüm A: Origin Formatı
```env
# Şu anda:
ALLOWED_ORIGINS=https://backendbg.ozpinar.live

# Deneyin (virgülle ayrılmış):
ALLOWED_ORIGINS=https://backendbg.ozpinar.live,http://localhost:3000
```

### Çözüm B: Multiple Origins
Frontend ve backend aynı domain'de ama subdomain farklıysa:
```env
ALLOWED_ORIGINS=https://backendbg.ozpinar.live,https://bg.ozpinar.live
```

### Çözüm C: Nginx/Reverse Proxy
Coolify reverse proxy CORS header'ları override ediyor olabilir.

---

## 📊 Network Tab Screenshot Gerekli

Browser DevTools → Network:
- `/api/address/provinces` isteğinin:
  - **Headers** (Request + Response)
  - **Status code**
  - Screenshot paylaşın
