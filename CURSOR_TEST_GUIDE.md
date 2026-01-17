# 🤖 CURSOR AI - 8BitWear Local Test Guide

Bu dosya Cursor AI'ın 8BitWear projesini local'de test etmesi için gerekli tüm adımları içerir.

---

## 📍 PROJE BİLGİLERİ

- **Proje Adı**: 8BitWear
- **Proje Tipi**: AI-powered e-commerce platform (Pixel art custom t-shirt)
- **Tech Stack**: Next.js 14, TypeScript, Prisma, PostgreSQL, OpenAI, Stripe
- **Local Path**: `/Users/serdarozerman/.cursor/worktrees/8bitwearnew/ssu/`
- **GitHub**: https://github.com/serdarozerman-debug/8bitwearnew

---

## ✅ CURSOR AI İÇİN TEST ADIMLARI

### ADIM 1: Proje Dizinine Git
```bash
cd /Users/serdarozerman/.cursor/worktrees/8bitwearnew/ssu/
```

**Doğrulama**:
```bash
pwd
# Çıktı: /Users/serdarozerman/.cursor/worktrees/8bitwearnew/ssu/
```

---

### ADIM 2: Proje Dosyalarını Kontrol Et
```bash
ls -la
```

**Olması gerekenler**:
- ✅ `package.json`
- ✅ `next.config.js` veya `next.config.ts`
- ✅ `app/` klasörü (Next.js 14 App Router)
- ✅ `prisma/schema.prisma`
- ✅ `.env` dosyası (env variables için)
- ✅ `components/` klasörü
- ✅ `lib/` klasörü

**Eğer `.env` yoksa**:
```bash
# .env.example'dan kopyala
cp .env.example .env
```

---

### ADIM 3: Environment Variables Kontrolü

`.env` dosyasını aç ve kontrol et:
```bash
cat .env
```

**Zorunlu değişkenler** (eksik olanları ekle):

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/8bitwear"

# OpenAI (CRITICAL - Pixel art için mutlaka gerekli!)
OPENAI_API_KEY="sk-proj-..."

# Replicate (Stable Diffusion - optional ama önerilen)
REPLICATE_API_TOKEN="r8_..."

# Stripe (Payment - test mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="orders@8bitwear.com"

# File Upload (Uploadthing)
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="..."

# Supplier Info
SUPPLIER_EMAIL="supplier@example.com"
SUPPLIER_NAME="Tedarikçi Firma"
```

**UYARI**: Eğer API key'leri yoksa, kullanıcıya sor!

---

### ADIM 4: Node Modules Kontrolü

```bash
# node_modules var mı kontrol et
ls -d node_modules
```

**Eğer node_modules YOKSA**:
```bash
npm install
```

**Eğer node_modules VARSA**:
```bash
# Sadece güncel mi kontrol et
npm outdated
```

---

### ADIM 5: Prisma Setup

```bash
# Prisma client'ı generate et
npx prisma generate
```

**Çıktı şöyle olmalı**:
```
✔ Generated Prisma Client (x.x.x) to ./node_modules/@prisma/client
```

**PostgreSQL veritabanı kontrolü**:
```bash
# PostgreSQL çalışıyor mu?
pg_isready
```

**Eğer PostgreSQL çalışmıyorsa**:

**Seçenek A - Docker ile**:
```bash
docker run --name 8bitwear-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=8bitwear \
  -p 5432:5432 \
  -d postgres:15
```

**Seçenek B - Cloud DB kullan** (Supabase, PlanetScale, Railway):
- Kullanıcıya sor: "PostgreSQL local'de yok. Cloud database connection string'iniz var mı?"
- Eğer varsa `.env`'deki `DATABASE_URL`'i güncelle

**Database migration**:
```bash
# Migration'ları çalıştır
npx prisma migrate dev
```

**Seed data (optional)**:
```bash
# Eğer seed script varsa
npm run db:seed
```

---

### ADIM 6: Dependencies Check (Kritik)

**Sharp kontrolü** (image processing için gerekli):
```bash
npm list sharp
```

**Eğer sharp yoksa**:
```bash
npm install sharp
```

**OpenAI SDK kontrolü**:
```bash
npm list openai
```

**Replicate SDK kontrolü**:
```bash
npm list replicate
```

**Eksik olanları yükle**:
```bash
npm install openai replicate sharp
```

---

### ADIM 7: Development Server'ı Başlat

```bash
npm run dev
```

**Beklenen çıktı**:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Environments: .env

✓ Ready in 2.5s
```

**Eğer port 3000 meşgulse**:
```bash
# Farklı port kullan
npm run dev -- -p 3001
```

---

### ADIM 8: Browser'da Test

Tarayıcıda aç: **http://localhost:3000**

**Kontrol edilecekler**:

1. **Ana sayfa yükleniyor mu?**
   - ✅ Header/navbar görünüyor
   - ✅ Ürün kataloğu var
   - ✅ Footer görünüyor

2. **Console'da hata var mı?**
   - Chrome DevTools → Console → Hataları kontrol et
   - Terminal'deki Next.js logları → Hataları kontrol et

3. **API endpoints çalışıyor mu?**
   - Test: http://localhost:3000/api/products
   - Beklenen: JSON response veya products listesi

---

### ADIM 9: Kritik Özellikleri Test Et

#### Test 1: Ürün Sayfası
```
http://localhost:3000/products
```
- ✅ Ürünler listeleniyor mu?
- ✅ Ürün kartları görünüyor mu?

#### Test 2: Ürün Detay Sayfası
```
http://localhost:3000/products/[slug]
```
(Örnek: `/products/basic-tshirt`)
- ✅ Ürün detayları yükleniyor mu?
- ✅ Custom Design butonu var mı?

#### Test 3: AI Pixel Art Converter (EN ÖNEMLİ!)
1. Ürün detay sayfasında "Custom Design" butonuna tıkla
2. Bir resim yükle (örnek: portre fotoğrafı)
3. "Convert to Pixel Art" butonuna tıkla
4. **Beklenen**:
   - ✅ Loading göstergesi
   - ✅ GPT-4o Vision analizi çalışıyor
   - ✅ Pixel art üretiliyor (Stable Diffusion veya DALL-E 3 + Post-processing)
   - ✅ Sonuç gösteriliyor

**Eğer hata alırsa**:
- Console'daki hatayı kontrol et
- Network tab'da `/api/ai/convert-image` endpoint'ine bak
- Response'u kontrol et:
  - 400/401: API key eksik
  - 429: Rate limit
  - 500: Server hatası

#### Test 4: Admin Dashboard (eğer varsa)
```
http://localhost:3000/admin
```
- Auth gerekiyor mu kontrol et

---

### ADIM 10: API Endpoint'leri Manuel Test

**Terminal'den curl ile test**:

```bash
# Products API
curl http://localhost:3000/api/products

# AI Convert API (POST request)
curl -X POST http://localhost:3000/api/ai/convert-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/photo.jpg",
    "prompt": "anime style"
  }'
```

**Beklenen response**:
```json
{
  "success": true,
  "convertedImageUrl": "...",
  "method": "stable-diffusion-via-replicate",
  "visionAnalysis": "..."
}
```

---

## 🔧 SORUN GİDERME (TROUBLESHOOTING)

### Sorun 1: "Cannot find module 'sharp'"
```bash
npm install sharp
npm rebuild sharp
```

### Sorun 2: "OpenAI API key not found"
```bash
# .env dosyasını kontrol et
cat .env | grep OPENAI_API_KEY

# Eğer yoksa ekle
echo 'OPENAI_API_KEY="sk-proj-..."' >> .env

# Server'ı yeniden başlat
npm run dev
```

### Sorun 3: "Database connection failed"
```bash
# PostgreSQL çalışıyor mu?
pg_isready

# Connection string doğru mu?
cat .env | grep DATABASE_URL

# Migration var mı?
npx prisma migrate status
```

### Sorun 4: "Port 3000 already in use"
```bash
# Port'u değiştir
npm run dev -- -p 3001

# Veya mevcut process'i öldür
lsof -ti:3000 | xargs kill -9
```

### Sorun 5: "Prisma Client not generated"
```bash
npx prisma generate
npm run dev
```

### Sorun 6: "CORS errors in browser"
- Normal, çünkü Next.js 14 App Router API routes CORS'u otomatik handle eder
- Eğer external API'den test ediyorsan, headers ekle

### Sorun 7: "Replicate API timeout"
- `convert-image/route.ts` fallback'e geçer (DALL-E 3 + Post-processing)
- Console loglarını kontrol et: `[AI Convert]` prefix'li loglar

---

## 📊 TEST SONUÇLARI RAPORU

Test tamamlandıktan sonra şu bilgileri topla:

```
✅ BAŞARILI TESTLER:
- [ ] Proje build başarılı
- [ ] Development server çalışıyor
- [ ] Ana sayfa yükleniyor
- [ ] Ürünler listeleniyor
- [ ] AI converter çalışıyor
- [ ] Database bağlantısı OK

❌ BAŞARISIZ TESTLER:
- [ ] (Hata varsa detayıyla yaz)

⚠️ UYARILAR:
- [ ] (Warning varsa yaz)

🔑 EKSIK API KEYS:
- [ ] OPENAI_API_KEY
- [ ] REPLICATE_API_TOKEN
- [ ] STRIPE keys
- [ ] Other...
```

---

## 🎯 CURSOR AI ÖZET KOMUTLAR

```bash
# 1. Proje dizinine git
cd /Users/serdarozerman/.cursor/worktrees/8bitwearnew/ssu/

# 2. Dependencies yükle (eğer gerekiyorsa)
npm install

# 3. Prisma setup
npx prisma generate
npx prisma migrate dev

# 4. Server'ı başlat
npm run dev

# 5. Browser'da aç
open http://localhost:3000

# 6. Test et ve logları izle
# (Terminal'deki [AI Convert] loglarına dikkat et)
```

---

## 📝 NOTLAR

- **Next.js 14 App Router** kullanılıyor (pages/ değil app/ klasörü)
- **Server Components** default (client components `"use client"` ile işaretli)
- **API Routes**: `app/api/*/route.ts` formatında
- **Pixel Art Pipeline**: GPT-4o Vision → Stable Diffusion → Post-processing (sharp)
- **Critical Dependencies**: openai, replicate, sharp, prisma, stripe
- **Database**: PostgreSQL (Supabase/PlanetScale/Railway cloud alternatifleri)

---

## 🚀 SONRAKI ADIMLAR

Test başarılıysa:
1. Production build dene: `npm run build`
2. Production server: `npm start`
3. Vercel/Railway deployment hazırlığı
4. Environment variables production'a taşı

---

## 📞 YARDIM GEREKİRSE

Eğer bir adımda takılırsan:
1. Console/terminal loglarını kopyala
2. Hatanın tam metnini al
3. Kullanıcıya sor: "X hatası alıyorum, nasıl çözerim?"

---

**Test başarılar! 🎉**
