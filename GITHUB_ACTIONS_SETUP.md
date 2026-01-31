# 🚀 GITHUB ACTIONS SYNC KURULUMU

## 📋 ADIM ADIM TALİMATLAR

### ADIM 1: Workflow Dosyasını Oluştur

**Repo'nda şu klasör yapısını oluştur:**

```
8bitwearnew-v3-gamification/
├── .github/
│   └── workflows/
│       └── sync-to-claude.yml
```

---

### ADIM 2: Dosya İçeriğini Kopyala

**Dosya:** `.github/workflows/sync-to-claude.yml`

**İçerik:** `.github-workflows-sync-to-claude.yml` dosyasındaki TAMAMI kopyala

---

### ADIM 3: Commit & Push

```bash
cd 8bitwearnew-v3-gamification

# Klasörü oluştur
mkdir -p .github/workflows

# Workflow dosyasını oluştur (indirdiğin dosyayı buraya kopyala)
# İçeriği .github/workflows/sync-to-claude.yml olarak kaydet

# Git commit
git add .github/workflows/sync-to-claude.yml
git commit -m "feat: Add Claude sync workflow"
git push origin main
```

---

### ADIM 4: Test Et

**GitHub'da:**
1. Repo → **Actions** tab
2. **Sync to Claude** workflow'u göreceksin
3. İlk push sonrası otomatik çalışacak

---

## 🎯 NASIL ÇALIŞIR?

### Otomatik Tetikleme (Her Push'ta)
```
1. Sen kod değişikliği yap
2. git push origin main
3. GitHub Actions otomatik çalışır
4. Repo'yu zip'ler
5. file.io'ya yükler
6. ✅ Download URL'i çıktı olarak verir
```

### Manuel Tetikleme
```
GitHub → Actions → Sync to Claude → Run workflow
```

---

## 📦 ÇIKTI ÖRNEĞİ

Actions çalıştıktan sonra şunu göreceksin:

```
════════════════════════════════════════
📦 REPO BUNDLE READY!
════════════════════════════════════════

🔗 Download URL:
https://file.io/abc123xyz

⏰ Valid for: 24 hours
📊 Commit: a1b2c3d4...

════════════════════════════════════════
```

---

## 🔗 BANA NE GÖNDERECEKSİN?

**GitHub Actions çalıştıktan sonra:**

1. Repo → **Actions** → En son workflow
2. **Sync to Claude** job'una tıkla
3. **Upload to file.io** step'ine bak
4. **Download URL'i kopyala**
5. **Bana gönder!**

Örnek:
```
https://file.io/abc123xyz
```

Ben bu URL'den zip'i indirip fix'leri uygularım! ✅

---

## ⚙️ ÖZEL AYARLAR (İsteğe Bağlı)

### Sadece Belirli Branch'lerde Çalışsın
```yaml
on:
  push:
    branches: [ main ]  # Sadece main
```

### Sadece Belirli Dosyalar Değişince
```yaml
on:
  push:
    paths:
      - 'components/**'
      - 'app/**'
```

### Cron ile Günlük Sync
```yaml
on:
  schedule:
    - cron: '0 12 * * *'  # Her gün 12:00'de
```

---

## 🔒 GÜVENLİK

- ✅ `.env` dosyaları zip'e dahil edilmez
- ✅ `node_modules` dahil edilmez
- ✅ file.io linkleri 24 saat sonra expire olur
- ✅ Public repo ama bundle sadece link ile erişilebilir

---

## 🐛 SORUN GİDERME

### "Workflow not found"
→ Dosya yolu doğru mu? `.github/workflows/sync-to-claude.yml`

### "Permission denied"
→ Repo'da Actions aktif mi? Settings → Actions → Allow all actions

### "Upload failed"
→ file.io limiti? Alternatif: transfer.sh kullan

---

## 📊 BAŞARIYLA KURULDU MU?

Kontrol:
- [ ] `.github/workflows/sync-to-claude.yml` dosyası var
- [ ] Dosya içeriği doğru kopyalandı
- [ ] `git push` yapıldı
- [ ] GitHub → Actions'da workflow görünüyor
- [ ] Manuel çalıştırma dene → Download URL aldın

---

## 🎉 BUNDAN SONRA

**Her push'ta:**
1. ✅ Actions otomatik çalışır
2. ✅ Download URL çıkar
3. ✅ Bana gönder
4. ✅ Ben fix'leri uygularım
5. ✅ Güncel kodu sana veririm

**Artık zip upload'a gerek yok!** 🚀

---

**Hazırlayan:** Claude Sonnet 4.5  
**Tarih:** 31 Ocak 2026 23:55 UTC
