# GÜNCEL AI PIXEL ART DÖNÜŞÜM AKIŞI (v3.3 - AGGRESSIVE)

**Tarih:** 2026-01-18  
**Versiyon:** v3.3 (Aggressive Background Removal)

---

## 📋 ADIM ADIM SÜREÇ

### STEP 1: Vision Analysis (GPT-4o)
**Amaç:** Fotoğraftan gerçek renkleri çıkar

**Model:** `gpt-4o`  
**Max Tokens:** 100

**Prompt:**
```
Analyze this photo carefully and identify the EXACT 5 dominant colors.

Return ONLY a JSON (no other text):
{
  "hair": "#HEX",
  "skin": "#HEX",
  "jacket": "#HEX",
  "pants": "#HEX",
  "shoes": "#HEX"
}

Rules:
- Look at the ACTUAL pixel colors in the photo
- hair: the main hair color (brown, black, blonde, etc.)
- skin: face/hand skin tone
- jacket: main upper clothing color (shirt, coat, jacket)
- pants: lower clothing color
- shoes: footwear color or accent
- Use realistic muted colors, NOT neon or oversaturated
- Example: if hair looks dark brown, use #3D2817 not #2A1B16
- Example: if jacket is white/cream, use #FEFEFE or #F5F5DC

Return ONLY the JSON with 5 hex colors.
```

**Default Palette (eğer Vision başarısız olursa):**
```json
{
  "hair": "#2A1B16",    // Dark brown
  "skin": "#F3B38D",    // Peach
  "jacket": "#F2F2F2",  // White/cream
  "pants": "#111316",   // Black/navy
  "shoes": "#9B30FF"    // Bright purple
}
```

**Shoes Brightness Auto-Correction:**
```javascript
// Vision'dan gelen ayakkabı rengi çok koyuysa, zorla parlak yap
const shoesBrightness = (r + g + b) / 3
if (shoesBrightness < 120) {
  colorPalette.shoes = '#9B30FF'  // Force bright purple
}
```

---

### STEP 2: DALL-E Image Generation (OpenAI Images API)

**API:** OpenAI Images API (images.edit)  
**Model:** `gpt-image-1`  
**Size:** `1024x1024`  
**Parameters:**
- `background: 'transparent'`
- `output_format: 'png'`
- `quality: 'high'`
- `input_fidelity: 'high'`

**Final Prompt (3 parça birleştirilmiş, max 1000 char):**

#### A) Standard Prompt:
```
Create a STRICT retro pixel-art sprite of the PERSON in the input photo.

TARGET LOOK:
- 64x64 sprite style, but generate at 1024x1024 as an UPSCALED pixel sprite (nearest-neighbor look).
- Pixels must appear as big crisp square blocks (no anti-aliasing, no smoothing).

SCALE & PROPORTIONS (CRITICAL):
- Character must fill ~80% of canvas height (big sprite, not tiny).
- Head-to-body ratio: 1:2 (BIG head, chibi/cute style - head should be almost half the body).
- Head should be ~24-28px high in the 64x64 grid look.

KEEP THESE DISTINCT FEATURES (must be visible):
- Puffy jacket with simple zipper line and collar shape (no shading).
- Earmuffs as two simple round pads.
- HAIR: SINGLE SOLID ROUNDED BLOB (NO individual strands, NO texture, NO spiky edges, COMPLETELY smooth rounded mass).
- Pants and shoes clearly separated.
- SHOES: BRIGHT PURPLE/MAGENTA accent color, clearly visible and distinct from pants.

COLOR HARMONY (CRITICAL - use extracted palette):
- ONLY use these 6 flat colors + black outline:
  1) Outline: #000000
  2) Skin: ${colorPalette.skin}
  3) Hair: ${colorPalette.hair}
  4) Jacket: ${colorPalette.jacket}
  5) Pants: ${colorPalette.pants}
  6) Shoes: ${colorPalette.shoes} (MUST be BRIGHT and VISIBLE - purple/magenta/bright pink)

Forbidden colors: neon green, neon lime, cyan glow.
If shoes color is not bright enough, use #9B30FF or #FF00FF for shoes.

SHAPES & RULES:
- Flat colors only, no gradients, no shading, no texture.
- Hair MUST be ONE SOLID SMOOTH BLOB (think: helmet shape, egg shape, rounded mass).
- Clean black outline around character and between major parts.
- Centered, full body visible.
- Background FULLY transparent (no ground, shadow, scenery, no beige, no tan, no cream, NO BLACK BACKGROUND - ONLY alpha channel).
- CRITICAL: BLACK BACKGROUND IS ABSOLUTELY FORBIDDEN. Use ONLY transparent alpha channel for background.
```

#### B) Pixel Lock:
```
Render as 64x64 sprite then upscale to 1024x1024 using nearest-neighbor for big crisp squares.
No anti-aliasing, no smoothing.
Max 8 colors total (including black outline).
Transparent background only.
```

#### C) User Prompt (opsiyonel, frontend'den):
```
User constraints: ${userPrompt}
```

---

### STEP 3: Post-Processing (Sharp + Aggressive Background Removal)

#### 3.1) Resize to 64x64
```javascript
sharp(aiImageBuffer)
  .resize(64, 64, {
    kernel: 'nearest',       // Pixel-perfect scaling, no interpolation
    fit: 'contain',          // Don't crop character (keep full body)
    position: 'center',      // Center the character
    background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent bg
  })
  .png({ 
    palette: true,   // Use indexed color
    colors: 8,       // Max 8 colors (6 palette + black + buffer)
    dither: 0        // No dithering (crisp pixels)
  })
  .toBuffer()
```

#### 3.2) Aggressive Background Removal (Flood-Fill from Edges)

**Koşul:** Eğer `transparency < 10%`, flood-fill uygula

**Background Detection Logic (v3.3 - AGGRESSIVE):**
```javascript
const brightness = (r + g + b) / 3
const isGrayish = Math.abs(r - g) < 40 && Math.abs(g - b) < 40

// 4 farklı background tipi:
const isDark = brightness < 60              // Black/dark (increased from 40)
const isDarkGray = brightness < 80 && isGrayish  // Dark gray (#3A3A3A, #4A4A4A)
const isBeigeish = r > 180 && g > 160 && b > 120 &&  // Beige/tan/cream
                   Math.abs(r - g) < 50 && r > b
const isLightGray = brightness > 140 && isGrayish  // Light gray

// Background olarak işaretle:
if (isDark || isDarkGray || isBeigeish || isLightGray) {
  toRemove.add(key)
}
```

**Flood-Fill Algoritması:**
1. Dört kenardan (top, bottom, left, right) başla
2. Her kenar pikselinden flood-fill yap (BFS/Stack)
3. Background-like piksel bulursa:
   - `toRemove` set'ine ekle
   - 4 komşuya (up, down, left, right) flood devam ettir
4. Karakter-like piksel bulursa:
   - O yönde flood'u durdur (karakter içine sızma)
5. Tüm `toRemove` piksellerini `alpha = 0` yap

#### 3.3) Island Removal
```javascript
// 1-3 piksel boyutundaki izole bölgeleri (gürültü) kaldır
// Connected components analysis ile küçük adacıkları tespit et
// Bunları alpha = 0 yap
```

---

## 🎨 RENKLENDİRME STRATEJİSİ

### Vision-Based Palette Extraction:
1. GPT-4o fotoğraftan 5 hex renk çıkarır
2. Eğer ayakkabı çok koyu (`brightness < 120`), zorla parlak mor yap
3. Bu palette DALL-E prompt'una enjekte edilir

### DALL-E Color Discipline:
- Prompt'ta "ONLY use these 6 flat colors" zorlaması
- Her vücut parçası için hex code verilir
- "Forbidden colors" listesi (neon green, lime, cyan)

### Post-Processing Color Quantization:
- Sharp ile 8 renge indir (palette mode)
- Dithering kapalı (crisp pixel boundaries)

---

## 🐛 BİLİNEN SORUNLAR VE ÇÖZÜMLER

### ❌ Sorun 1: Siyah Fon Kalmaya Devam Ediyor
**Neden:**
- DALL-E bazen `background: 'transparent'` parametresine rağmen siyah/koyu fon üretiyor
- Flood-fill sadece kenardan bağlantılı pikselleri temizliyor

**Çözüm v3.3:**
- `isDark` threshold: `40 → 60` (daha fazla koyu piksel yakala)
- Yeni check: `isDarkGray` (brightness < 80 && grayish)
- Prompt'a eklendi: "BLACK BACKGROUND IS ABSOLUTELY FORBIDDEN"

**Eğer hala sorun devam ediyorsa:**
1. Threshold'u daha da yükselt: `brightness < 80`
2. Flood-fill'e ek olarak "full scan" ekle (tüm koyu pikselleri tara, karakter olmadığını teyit et)
3. DALL-E yerine farklı model dene (Replicate SDXL fallback var)

### ❌ Sorun 2: Saçlar Tel Tel
**Neden:**
- DALL-E "curly hair" gibi ifadeleri literal alıyor

**Çözüm v3.2:**
- Prompt: "SINGLE SOLID ROUNDED BLOB"
- "NO individual strands, NO texture, NO spiky edges"
- "Think: helmet shape, egg shape"

### ❌ Sorun 3: Ayakkabı Rengi Belli Değil
**Neden:**
- Vision API fotoğraftan koyu renk çıkarıyor
- DALL-E karanlık/siyah ayakkabı üretiyor

**Çözüm v3.2:**
- Default shoes: `#9B30FF` (bright purple)
- Auto-correction: `brightness < 120` ise zorla parlak yap
- Prompt: "BRIGHT PURPLE/MAGENTA accent color"

### ❌ Sorun 4: Kafa Çok Küçük
**Neden:**
- DALL-E realistic proportions kullanıyor

**Çözüm v3.2:**
- Prompt: "Head-to-body ratio: 1:2 (BIG head, chibi/cute style)"
- "Head should be ~24-28px high in 64x64 grid"

---

## 📊 PERFORMANS

**Tipik İşlem Süresi:**
- Vision Analysis: ~2-3 saniye
- DALL-E Generation: ~15-20 saniye
- Post-Processing: ~1-2 saniye
- **Toplam: ~18-25 saniye**

**API Maliyeti (tahmini):**
- GPT-4o Vision: $0.002/request
- DALL-E 3 (gpt-image-1): $0.04/image
- **Toplam: ~$0.042/conversion**

---

## 🔄 ALTERNATİF: Replicate SDXL Fallback

Eğer OpenAI başarısız olursa veya `provider: 'replicate'` istenirse:

**Model:** `stability-ai/sdxl` (image-to-image)  
**Guidance Scale:** 6.5  
**Strength:** 0.75  
**Negative Prompt:**
```
two people, multiple characters, duplicate, twins, crowd, extra person, 
clone, mirror, shading, gradients, blur, background, text, watermark, 
lighting effects, realistic details, strands, texture
```

---

## 📁 İLGİLİ DOSYALAR

- **API Endpoint:** `/app/api/ai/convert-image/route.ts` (500+ satır)
- **Frontend Component:** `/components/CustomDesignEditor.tsx`
- **Product Detail:** `/app/products/[slug]/page.tsx`
- **Environment:** `.env.local` (OPENAI_API_KEY, REPLICATE_API_TOKEN)

---

## ✅ v3.3 YENİLİKLERİ

1. **Aggressive Dark Background Removal:**
   - `brightness < 60` (40'tan artırıldı)
   - Yeni check: `isDarkGray` (brightness < 80 && grayish)
   - Daha fazla koyu piksel yakalıyor

2. **DALL-E Prompt - Black Background Forbidden:**
   - Eklendi: "BLACK BACKGROUND IS ABSOLUTELY FORBIDDEN"
   - Daha agresif transparent background zorlaması

3. **Dokumentasyon:**
   - Bu dosya oluşturuldu: `CURRENT_AI_FLOW_v3.3.md`
   - Tüm akış, prompt, ve post-processing detayları

---

## 🧪 TEST

```bash
# Server:
http://localhost:3200

# Test URL:
http://localhost:3200/products/premium-tisort

# API Direct Test:
curl -X POST http://localhost:3200/api/ai/convert-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "data:image/png;base64,...", "prompt": "test"}'
```

---

**Son Güncelleme:** 2026-01-18 (v3.3 - Aggressive Background Removal)
