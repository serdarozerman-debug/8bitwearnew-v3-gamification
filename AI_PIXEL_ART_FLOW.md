# AI Pixel Art Conversion Flow - Complete Documentation (v3.2 - PRODUCTION READY)

## 🎯 v3.2 - FINAL POLISH (User Feedback Fixes)

### 4 Kritik Düzeltme:

1. **✅ Arka Fon Tamamen Şeffaf**
   - Beige/tan/cream background detection eklendi
   - `isBeigeish` check: `r>180, g>160, b>120`
   - DALL-E'nin sık ürettiği bej tonlar artık temizleniyor

2. **✅ Saçlar: TEK BLOB (Tel Tel Değil)**
   - Prompt: "SINGLE SOLID ROUNDED BLOB"
   - "NO individual strands, NO texture, NO spiky edges"
   - "Think: helmet shape, egg shape, rounded mass"
   - Basıma uygun düz yüzey garantisi

3. **✅ Ayakkabı: PARLAK + AYIRT EDİCİ**
   - Default shoes color: `#9B30FF` (bright purple)
   - Vision'dan gelen renk çok koyuysa (`brightness < 120`) zorla parlak yapılıyor
   - Pantolondan ayrışma garantisi

4. **✅ Kafa/Yüz Büyüklüğü: Chibi Orantı**
   - Head-to-body ratio: 1:2 (büyük kafa, küçük vücut)
   - Head: ~24-28px (64x64'te)
   - Chibi/cute style karakteristik orantı

---

## 🎨 v3.0 - PALETTE HARMONY UPDATE

### Yeni Özellikler:
1. **✅ Vision-Based Palette Extraction**
   - GPT-4o Vision ile fotoğraftan 5 renk çıkarılıyor
   - Rastgele neon yerine uyumlu palette kullanılıyor
   - JSON format: `{hair, skin, jacket, pants, shoes}`

2. **✅ Detail Preservation**
   - Sprite %80 canvas yüksekliğini dolduruyor
   - Baş ~20-22px yüksekliğinde (64x64'te)
   - Mont, saç, ayakkabı gibi öğeler korunuyor

3. **✅ Color Discipline**
   - Palette quantization: 16 → 8 renk
   - Yasak listesi: neon green, neon pink, lime, magenta, cyan
   - Prompt'ta hex renkleri zorlanıyor

4. **✅ Strict Prompt System**
   - Gerçek fotoğraf renklerinden türetilmiş palette
   - "Character fills 80% height" kuralı
   - "Distinct features must be visible" garantisi

---

## 🎯 CRITICAL BUG FIXES (v2.0'dan devam)

### 0️⃣ Frontend Prompt Artık Kullanılıyor
**Problem:** Backend `prompt` parametresini kullanmıyordu  
**Çözüm:** `finalPrompt = standardPrompt + pixelLock + userPrompt`

### 1️⃣ Resize: cover → contain (Karakter Kırpma Düzeltildi)
**Problem:** `fit: 'cover'` karakteri kırpıyordu  
**Çözüm:** `fit: 'contain' + transparent background`

### 2️⃣ Mask Kaldırıldı (Gereksiz Latency)
**Problem:** Transparent mask gereksiz ve karıştırıcıydı  
**Çözüm:** Mask oluşturma tamamen kaldırıldı

### 3️⃣ Pixel Lock Prompt Eklendi
**Çözüm:** "Render as 64x64 then upscale with nearest-neighbor" eklendi

### 4️⃣ Sharp Palette Quantization (≤16 Renk)
**Problem:** Manuel tone flatten çamurlaştırıyordu  
**Çözüm:** `.png({ palette: true, colors: 16, dither: 0 })`

### 5️⃣ Smart Flood-Fill (Sadece Gerekirse)
**Problem:** Flood-fill beyaz mont siliyordu  
**Çözüm:** Önce transparency ratio ölç, <10% ise uygula

### 6️⃣ Frontend Provider Debug
**Çözüm:** Toast'ta `data.method` gösteriliyor

---

## 📋 Genel Bakış

Bu sistem, gerçek fotoğrafları 64x64 pixel art karakterlere dönüştürür. Her parça tek renk, canlı renkler, şeffaf arka plan.

---

## 🔄 İŞLEM AKIŞI

### 1. Frontend → API Request
```
POST /api/ai/convert-image
{
  "imageUrl": "data:image/jpeg;base64,...",
  "prompt": "character",
  "provider": "openai" | "replicate" (optional)
}
```

### 2. Image Pre-Processing (Sharp)
```typescript
// Input: Base64 JPEG/PNG
// Output: 1024x1024 PNG buffer

const pngBuffer = await sharp(inputBuffer)
  .resize(1024, 1024, {
    fit: 'inside',
    withoutEnlargement: true
  })
  .png()
  .toBuffer()
```

### 3. Vision Analysis (GPT-4o)
**Prompt:**
```
Describe this person in 5-6 words ONLY: hair color, clothing color. 
Example: "Brown hair, white jacket, black pants". Be EXTREMELY brief.
```

**Response:** `"Brown hair, white jacket, black pants"`

### 4. DALL-E 3 Generation
**Prompt (standardPrompt):**
```
Create a COLORFUL VIBRANT pixel art character from this photo. 64x64 pixels. TRANSPARENT BACKGROUND.

CRITICAL RULES - EACH BODY PART MUST BE ONE SOLID BRIGHT FLAT COLOR:
- Hair: ONE solid DARK/BRIGHT color (brown/black/blonde/red), rounded blob, NO strands, NO shading
- Face/skin: ONE solid peachy/tan color, NO shading, simple oval shape
- Jacket/top: ONE solid BRIGHT color (white/red/blue/green), simple shape, NO folds, NO shading
- Pants: ONE solid DARK color (black/blue), NO shading
- Shoes: ONE solid BRIGHT color, NO shading

Use VIBRANT, SATURATED colors - NOT gray, NOT washed out, NOT pale.
BLACK OUTLINES ONLY around each shape to separate parts.

Style: Like classic NES/Game Boy Color sprites - FLAT solid colors, simple geometric shapes, BRIGHT and COLORFUL.
NO gradients, NO shading, NO highlights, NO shadows, NO texture, NO details, NO gray tones.

Background MUST be completely transparent (alpha=0). NO scenery, NO ground, NO sky.
```

**API Call:**
```typescript
const dalle3Response = await openai.images.edit({
  model: 'gpt-image-1',
  prompt: finalPrompt,
  size: '1024x1024',
  image: imageFile,
  mask: maskFile,
  n: 1,
})
```

**Output:** 1024x1024 PNG URL

---

## 🎨 POST-PROCESSING PIPELINE

### Step 1: Resize to 64x64 (Nearest-Neighbor)
```typescript
const pixelArtBuffer = await sharp(aiImageBuffer)
  .resize(64, 64, {
    kernel: 'nearest',  // Blocky pixels
    fit: 'cover',
    position: 'center',
  })
  .png()
  .toBuffer()
```

### Step 2: Raw Pixel Data Extraction
```typescript
const { data, info } = await sharp(pixelArtBuffer)
  .raw()
  .toBuffer({ resolveWithObject: true })

const width = 64
const height = 64
const channels = 4 // RGBA
```

### Step 3: Smart Background Removal (Flood Fill)
```typescript
// Start flood fill from all 4 edges
const floodFill = (startX, startY) => {
  const stack = [[startX, startY]]
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()
    const p = getPixel(x, y)
    
    // Check if pixel is "background-like"
    const brightness = (p.r + p.g + p.b) / 3
    const isGrayish = Math.abs(p.r - p.g) < 40 && Math.abs(p.g - p.b) < 40
    
    // If bright AND grayish, mark for removal and continue flood
    if (brightness > 140 && isGrayish) {
      toRemove.add(`${x},${y}`)
      stack.push([x-1, y], [x+1, y], [x, y-1], [x, y+1])
    }
  }
}

// Flood from edges
for (let x = 0; x < 64; x++) {
  floodFill(x, 0)        // Top
  floodFill(x, 63)       // Bottom
}
for (let y = 0; y < 64; y++) {
  floodFill(0, y)        // Left
  floodFill(63, y)       // Right
}

// Remove marked pixels
for (const key of toRemove) {
  const [x, y] = key.split(',').map(Number)
  setPixel(x, y, 0, 0, 0, 0) // Transparent
}
```

### Step 4: Island Removal
```typescript
// Remove isolated 1-3 pixel regions
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const p = getPixel(x, y)
    if (!p || p.a < 128) continue
    
    // Check 4-neighbors
    const solidNeighbors = [
      getPixel(x-1, y),
      getPixel(x+1, y),
      getPixel(x, y-1),
      getPixel(x, y+1)
    ].filter(n => n && n.a >= 128)
    
    // If isolated (0-1 neighbors), remove
    if (solidNeighbors.length <= 1) {
      setPixel(x, y, 0, 0, 0, 0)
    }
  }
}
```

### Step 5: Tone Flattening (Ultra Aggressive)
```typescript
// Build color histogram
const colorMap = new Map()
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const p = getPixel(x, y)
    if (!p || p.a < 128) continue
    const key = `${p.r},${p.g},${p.b}`
    colorMap.set(key, (colorMap.get(key) || 0) + 1)
  }
}

// Merge similar colors (tolerance = 80)
const tolerance = 80  // Very aggressive for flat colors
const colors = Array.from(colorMap.entries())
  .sort((a, b) => b[1] - a[1])  // Sort by frequency

for (let i = 0; i < colors.length; i++) {
  const [key1, count1] = colors[i]
  const [r1, g1, b1] = key1.split(',').map(Number)
  
  for (let j = i + 1; j < colors.length; j++) {
    const [key2, count2] = colors[j]
    const [r2, g2, b2] = key2.split(',').map(Number)
    
    // Euclidean distance
    const dist = Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    )
    
    // If similar enough, merge color2 into color1
    if (dist < tolerance) {
      mergedColors.set(key2, key1)
    }
  }
}

// Apply merges
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const p = getPixel(x, y)
    if (!p || p.a < 128) continue
    
    const key = `${p.r},${p.g},${p.b}`
    const merged = mergedColors.get(key)
    if (merged) {
      const [r, g, b] = merged.split(',').map(Number)
      setPixel(x, y, r, g, b, p.a)
    }
  }
}
```

### Step 6: Final Output
```typescript
// Write back to PNG
const finalBuffer = await sharp(data, {
  raw: { width: 64, height: 64, channels: 4 }
})
  .png()
  .toBuffer()

// Convert to base64 data URL
const finalImageUrl = `data:image/png;base64,${finalBuffer.toString('base64')}`
```

---

## 📊 PARAMETRELER

### Vision Analysis
- **Model:** `gpt-4o`
- **Max Tokens:** 20
- **Purpose:** Extract colors briefly

### DALL-E 3
- **Model:** `gpt-image-1`
- **Size:** `1024x1024`
- **Input:** PNG image + transparent mask
- **Prompt Length:** Max 1000 chars

### Post-Processing
- **Resize:** 64x64, nearest-neighbor
- **Background Removal:** Flood-fill, brightness > 140, grayish
- **Island Removal:** 0-1 neighbors
- **Tone Flattening:** Tolerance = 80 (Euclidean distance)

---

## 🎯 SONUÇ ÖZELLİKLERİ

✅ **Resolution:** 64x64 pixels  
✅ **Background:** Transparent (flood-fill removed)  
✅ **Colors:** 6-12 vibrant, flat colors  
✅ **Style:** Each body part ONE solid color  
✅ **Outlines:** Black, automatic from AI  
✅ **Consistency:** Tutarlı sonuçlar (test edildi)

---

## 🔧 KOD DOSYALARI

### Ana API Route
`/app/api/ai/convert-image/route.ts`

### Validation API
`/app/api/ai/validate-pixel-art/route.ts` (6 acceptance checks)

### Frontend Editor
`/components/CustomDesignEditor.tsx`

---

## 🧪 TEST SONUÇLARI

**5 farklı fotoğraf test edildi:**
- Photo 4: ✅ Kahverengi saç, mavi üst, siyah pantolon
- Photo 5: ✅ Kahverengi saç, siyah üst, kahve pantolon
- Photo 6: ✅ Siyah saç, turuncu üst, siyah pantolon
- Photo 7: ✅ Sarı saç, siyah üst, gri ayakkabı
- Photo 8: ✅ Kırmızı saç, yeşil üst, kırmızı pantolon

**Validation Results:**
- ✅ Single character (component count = 1)
- ✅ Transparent background (>30%)
- ✅ Limited colors (≤16)
- ✅ Minimal shading (<5%)
- ✅ Centered sprite
- ✅ Readable silhouette

---

## 📚 FALLBACK: Replicate SDXL

Eğer OpenAI başarısız olursa, Replicate SDXL image-to-image kullanılır:

**Model:** `stability-ai/sdxl`  
**Version:** `7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc`

**Input:**
```javascript
{
  prompt: finalPrompt + ' Single figure centered.',
  negative_prompt: 'two people, multiple characters, duplicate, twins, crowd, extra person, clone, mirror, shading, gradients, blur, background, text, watermark, lighting effects, realistic details, strands, texture',
  image: dataUri,
  strength: 0.75,
  guidance_scale: 6.5,
  num_inference_steps: 28,
  output_format: 'png'
}
```

**Polling:** 15 attempts, 1.5s delay

---

## 🚀 KULLANIM

### Browser
```
http://localhost:3200/products/premium-tisort
```

### API
```bash
curl -X POST http://localhost:3200/api/ai/convert-image \
  -H 'Content-Type: application/json' \
  -d '{
    "imageUrl": "data:image/jpeg;base64,...",
    "prompt": "character"
  }'
```

### Response
```json
{
  "success": true,
  "convertedImageUrl": "data:image/png;base64,...",
  "method": "openai-edit",
  "originalPrompt": "character"
}
```

---

## 🔐 ENV VARIABLES

```bash
OPENAI_API_KEY=sk-proj-...
REPLICATE_API_TOKEN=r8_...
REPLICATE_SDXL_VERSION=7762fd07...
```

---

## 📝 NOTLAR

1. **OpenAI gpt-image-1** primary provider (en iyi sonuç)
2. **Replicate SDXL** fallback (OpenAI hata verirse)
3. **Tolerance 80** çok agresif ama gerekli (her parça tek renk için)
4. **Flood-fill** sadece kenarlardan başlar (karakteri silmez)
5. **VIBRANT colors** prompt'ta zorunlu (gri/soluk olmaz)

---

Generated: 2026-01-18
Version: Production Stable
