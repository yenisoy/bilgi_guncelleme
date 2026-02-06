# Coolify Deployment Guide - Docker Compose Hatası Çözümü

## ⚠️ Docker Compose Hatası

Aldığınız hata Coolify'ın docker-compose.yml dosyasını işlerken oluşuyor. Coolify bazı durumlarda docker-compose projelerini doğru algılamayabiliyor.

## ✅ Çözüm Seçenekleri

### **Seçenek 1: Servisleri Manuel Olarak Ekleyin (ÖNERİLEN)**

Coolify'da docker-compose yerine her servisi ayrı ayrı resource olarak ekleyin:

#### 1. MongoDB Servisi
- **Type**: Docker Image
- **Image**: `mongo:7`
- **Environment Variables**:
  ```
  MONGO_INITDB_DATABASE=adres-dogrulama
  ```
- **Volumes**: 
  - `/data/db` → persistent storage
- **Network**: Internal only
- **Service Name**: `adres-mongo`

#### 2. Backend Servisi
- **Type**: Git Repository (Dockerfile)
- **Repository**: `https://github.com/yenisoy/bilgi_guncelleme.git`
- **Branch**: `main`
- **Dockerfile Location**: `backend/Dockerfile`
- **Build Context**: `backend/`
- **Environment Variables**:
  ```
  PORT=3001
  MONGODB_URI=mongodb://adres-mongo:27017/adres-dogrulama
  JWT_SECRET=your-secret-key-here
  ADMIN_EMAIL=admin@test.com
  ADMIN_PASSWORD=secure-password-here
  ALLOWED_ORIGINS=*
  ```
- **Network**: Internal (bağlı olduğu network'te `adres-mongo` erişilebilir olmalı)
- **Service Name**: `adres-backend`

#### 3. Frontend Servisi
- **Type**: Git Repository (Dockerfile)
- **Repository**: `https://github.com/yenisoy/bilgi_guncelleme.git`
- **Branch**: `main`
- **Dockerfile Location**: `frontend/Dockerfile`
- **Build Context**: `frontend/`
- **Port**: `80`
- **Domain**: Your domain (e.g., `admin.yourdomain.com`)
- **Environment Variables**:
  ```
  API_URL=http://adres-backend:3001
  ```
- **Network**: Public (domain ile erişilebilir)
- **Service Name**: `adres-frontend`

#### Network Yapılandırması
Tüm servisleri **aynı Docker network**'e ekleyin (Coolify'da "Network" sekmesinden yapılır).

---

### **Seçenek 2: Docker Compose v2 Formatı Kullanın**

Mevcut `docker-compose.yml` dosyanız muhtemelen eski formatta. Yeni formata güncellenmiş versiyonu kullanın.

**İşlem Adımları:**
1. Coolify'da projeyi silin
2. Repository'yi yeniden ekleyin
3. **Build Pack**: Docker Compose seçin
4. **Compose File**: `docker-compose.yml` olarak belirtin
5. Deploy'u tekrar deneyin

---

### **Seçenek 3: Monorepo Yapısından Tek Servis Yapısına Geçin**

Coolify bazı monorepo yapılarında sorun yaşayabiliyor. Bu durumda:

1. **Frontend-only deployment** yapın (statik site olarak)
2. **Backend'i ayrı bir repository'de** deploy edin
3. Frontend'de backend API URL'ini environment variable olarak yapılandırın

---

## 🔧 Hızlı Test: Manuel Docker Compose Çalıştırma

Yerel ortamda (Docker kurulu bir makinede) şunu test edin:

```bash
git clone https://github.com/yenisoy/bilgi_guncelleme.git
cd bilgi_guncelleme
docker compose up -d
```

Eğer yerel ortamda çalışıyorsa sorun Coolify-specific'tir.

---

## 📋 Önerilen Yaklaşım

**En kolay ve en güvenilir yöntem Seçenek 1'dir** (servisleri manuel eklemek). 

Adımları sırasıyla takip edin:
1. ✅ MongoDB container'ı ekle ve başlat
2. ✅ Backend container'ı ekle (MongoDB'ye bağlı)
3. ✅ Frontend container'ı ekle (Backend'e bağlı)

Her adımda health check'leri kontrol edin.

---

## 🆘 Hala Sorun Yaşıyorsanız

Coolify loglarını paylaşın veya şu bilgileri kontrol edin:
- Coolify versiyonu
- Docker ve Docker Compose versiyonu
- Build container logları (detaylı hata mesajı)
