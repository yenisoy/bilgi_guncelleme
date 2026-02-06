# Backend "Unhealthy" Hatası Çözümü

## 🔴 Durum
Backend container başladı ama **unhealthy** durumda. Bu yüzden frontend başlamadı.

## 📋 HEMEN YAPMANIZ GEREKENLER

### **1. Backend Loglarını Kontrol Edin**

Coolify panelinde:

1. **Services** veya **Containers** bölümüne gidin
2. **Backend** service'i bulun
3. **Logs** butonuna tıklayın
4. En son logları okuyun

**Aranacak şeyler:**
- `MongoDB bağlantı hatası` var mı?
- `Server 3001 portunda çalışıyor` yazıyor mu?
- `EADDRINUSE` veya `port already in use` var mı?
- Başka bir hata mesajı var mı?

---

### **2. Muhtemel Sorunlar ve Çözümleri**

#### **Sorun A: MongoDB Bağlantısı**
Eğer logda şöyle bir hata varsa:
```
MongoDB bağlantı hatası
MongooseError: connect ECONNREFUSED
```

**Çözüm**: Environment variable'da MongoDB URI yanlış olabilir.
- Coolify'da `MONGODB_URI=mongodb://mongo:27017/adres-dogrulama` olduğundan emin olun

---

#### **Sorun B: Health Check Çok Hızlı**
Backend başlamadan health check devreye giriyor olabilir.

**Çözüm**: Health check parametrelerini güncelleyin.

Docker-compose.yml'de backend health check'i şu şekilde değiştirin:

**ESKISI:**
```yaml
start_period: 40s
retries: 3
```

**YENİSİ:**
```yaml
start_period: 90s
retries: 10
```

---

#### **Sorun C: wget Kurulu Değil**
Backend Dockerfile'da wget kurulu olmayabilir.

**Çözüm**: Zaten eklemiştik ama kontrol edelim. Backend loglarında şöyle bir hata varsa:
```
wget: not found
```

Backend Dockerfile'ın başında `RUN apk add --no-cache wget` olmalı.

---

### **3. Geçici Çözüm: Health Check'i Devre Dışı Bırakın**

Eğer sorun health check'ten kaynaklanıyorsa, geçici olarak devre dışı bırakabilirsiniz:

Docker-compose.yml'de backend bölümünden **healthcheck** satırlarını tamamen silip tekrar deploy edin.

---

### **4. Manuel Container Çalıştırma Testi**

Coolify dışında yerel test için:

```bash
cd backend
docker build -t test-backend .
docker run -p 3001:3001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/test \
  -e JWT_SECRET=test \
  -e ADMIN_EMAIL=admin@test.com \
  -e ADMIN_PASSWORD=admin123 \
  test-backend
```

Container başladıktan sonra:
```bash
curl http://localhost:3001/api/health
```

Bu `{"status":"ok"}` dönmeli.

---

## 🎯 SONRAKI ADIM

1. **Backend loglarını kontrol edin** (en önemli!)
2. Loglarda gördüğünüz hatayı bana gönderin
3. O hataya göre çözüm uygularız

---

## 📝 Not

MongoDB healthy oldu, bu güzel bir işaret. Sorun muhtemelen:
- Backend kodunda bir bug
- Environment variable eksik/yanlış
- Health check çok erken tetikleniyor

Backend logları sorunun kaynağını gösterecek.
