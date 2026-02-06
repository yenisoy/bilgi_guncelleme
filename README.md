# Adres Doğrulama Sistemi

Türkiye'de adres doğrulama ve güncelleme sistemi.

## 📁 Proje Yapısı

```
adres-dogrulama/
├── backend/          # Node.js API + Admin Panel
│   ├── src/
│   └── Dockerfile
├── frontend/         # Admin Paneli (statik)
│   ├── admin/        # Admin sayfaları
│   ├── css/
│   ├── js/
│   └── Dockerfile
├── public-html/      # ⚠️ AYRI SUNUCUDA ÇALIŞACAK (Git'e dahil değil)
│   ├── index.html    # Public form
│   ├── css/
│   └── js/
└── docker-compose.yml
```

## 🚀 Hızlı Başlangıç


### 1. Docker ile Yerel Çalıştırma

```bash
# Projeyi klonlayın
git clone https://github.com/yenisoy/bilgi_guncelleme.git
cd bilgi_guncelleme

# Docker Compose ile başlatın
docker-compose up -d

# Logları kontrol edin
docker-compose logs -f
```

Servisler şu adreslerde çalışacaktır:
- **Frontend (Admin Panel)**: http://localhost
- **Backend API**: http://localhost:3001/api
- **Admin Girişi**: http://localhost/admin/login.html

**Varsayılan Admin Bilgileri:** `admin@test.com` / `admin123`

### 2. Coolify ile Deploy

Coolify platformunda projeyi deploy etmek için:

#### Adım 1: Git Repository Bağlantısı
Coolify'da yeni bir proje oluşturun ve bu Git repository'yi bağlayın:
```
https://github.com/yenisoy/bilgi_guncelleme.git
```

#### Adım 2: Ortam Değişkenlerini Ayarlayın
Coolify panel'inde aşağıdaki ortam değişkenlerini ekleyin:

```env
# Backend Ayarları
JWT_SECRET=gizli-anahtar-buraya-girin
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=guvenli-sifre-buraya-girin
MONGODB_URI=mongodb://mongo:27017/adres-dogrulama
ALLOWED_ORIGINS=https://sizin-domain.com

# Frontend Ayarları (opsiyonel)
FRONTEND_PORT=80
API_URL=http://backend:3001
```

#### Adım 3: Docker Compose Deploy
Coolify otomatik olarak `docker-compose.yml` dosyasını tespit edecek ve şu servisleri deploy edecektir:
- MongoDB (veri tabanı)
- Backend (Node.js API)
- Frontend (Nginx ile admin panel)

#### Adım 4: Domain Ayarları
Coolify'da servisleriniz için domain ayarlayın:
- Frontend için: `https://admin.sizin-domain.com`
- Backend için: `https://api.sizin-domain.com` (opsiyonel, eğer public form varsa)

## 🔧 Ortam Değişkenleri

### Backend
| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `PORT` | Backend port numarası | `3001` |
| `MONGODB_URI` | MongoDB bağlantı adresi | `mongodb://mongo:27017/adres-dogrulama` |
| `JWT_SECRET` | JWT token için gizli anahtar | - |
| `ADMIN_EMAIL` | Yönetici e-posta | `admin@test.com` |
| `ADMIN_PASSWORD` | Yönetici şifresi | `admin123` |
| `ALLOWED_ORIGINS` | CORS için izin verilen domainler | `*` |

### Frontend
| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `FRONTEND_PORT` | Frontend port numarası | `80` |
| `API_URL` | Backend API adresi | `http://backend:3001` |

## 📊 Mimari

```
┌─────────────────────┐         ┌─────────────────────┐
│   Public HTML       │  ←---→  │  Backend + Admin    │
│ (farklı sunucu)     │  CORS   │  (Docker/Coolify)   │
│                     │         │                     │
│ - index.html        │         │ - API (/api/...)    │
│ - js/app.js         │         │ - Admin Panel       │
└─────────────────────┘         └─────────────────────┘
                                         │
                                         ↓
                                ┌─────────────────┐
                                │    MongoDB      │
                                │  (veri tabanı)  │
                                └─────────────────┘
```

## 📦 Public HTML (Ayrı Deploy)

`public-html/` dizini Git'e dahil edilmemiştir ve ayrı bir sunucuda çalıştırılmalıdır.

### Public HTML'i Deploy Etme:

1. `public-html/` içeriğini istediğiniz web sunucusuna yükleyin
2. API URL'ini yapılandırın - `public-html/js/app.js` dosyasında:

```javascript
// API base URL'ini ayarlayın
const API_BASE_URL = 'https://api.sizin-domain.com/api';
```

veya HTML dosyasında:

```html
<script>
    window.API_BASE_URL = 'https://api.sizin-domain.com/api';
</script>
```

3. CORS ayarlarını backend'de güncelleyin:
   - `ALLOWED_ORIGINS` ortam değişkenine public HTML'in domain'ini ekleyin

## 🛠️ Geliştirme

### Yerel Geliştirme Ortamı

```bash
# Backend'i yerel çalıştırma
cd backend
npm install
npm run dev

# Frontend için herhangi bir web sunucu kullanabilirsiniz
cd frontend
python -m http.server 8000
# veya
npx http-server -p 8000
```

### Docker ile Geliştirme

```bash
# Servisleri yeniden build et
docker-compose build

# Tek bir servisi yeniden başlat
docker-compose restart backend

# Logları izle
docker-compose logs -f backend
```

## 🔍 Sorun Giderme

### MongoDB bağlantı hatası
```bash
# MongoDB servisinin çalıştığını kontrol edin
docker-compose ps mongo

# MongoDB loglarını kontrol edin
docker-compose logs mongo
```

### Backend servisi başlamıyor
```bash
# Backend loglarını kontrol edin
docker-compose logs backend

# Health check durumunu kontrol edin
docker-compose ps backend
```

### CORS hatası
- `ALLOWED_ORIGINS` ortam değişkeninin doğru ayarlandığından emin olun
- Public HTML'in domain'i backend CORS ayarlarında izin verilen listede olmalı

## 📝 Notlar

- **Güvenlik**: Production ortamında `JWT_SECRET` ve `ADMIN_PASSWORD` değerlerini mutlaka değiştirin
- **MongoDB**: Docker volume kullanarak veriler kalıcı hale getirilmiştir
- **Health Checks**: Tüm servisler health check içerir, Coolify bu sayede servislerin durumunu takip edebilir
- **Public HTML**: Git'e dahil değildir, ayrı deploy edilmelidir

## 📧 İletişim

Sorularınız için: [yenisoy](https://github.com/yenisoy)

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
