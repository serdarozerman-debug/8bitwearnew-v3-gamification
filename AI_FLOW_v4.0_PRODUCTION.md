# AI PIXEL ART CONVERSION FLOW v4.0 - PRODUCTION READY

**Tarih:** 2026-01-18  
**Versiyon:** v4.0 (Major Refactor - User Feedback Implementation)

---

## 🚀 v4.0 - MAJOR CHANGES

### 7 Kritik Düzeltme Uygulandı:

1. **✅ 1000 Karakter Limiti KALDIRILDI**
   - Artık prompt kesilmiyor
   - "Transparent background" ve "palette" gibi kritik kısımlar korunuyor

2. **✅ Alpha Transparency Debug Eklendi**
   - Her işlemde `alphaZeroRatio` hesaplanıyor
   - Log'dan anlaşılıyor: Gerçekten siyah piksel mi, yoksa UI background mu?

3. **✅ Edge-Major-Color Flood-Fill**
   - Heuristic kurallar yerine (dark/beige/gray) kenar rengine göre otomatik tespit
   - Color distance threshold: 40
   - Daha robust, tüm background tiplerinde çalışıyor

4. **✅ Quantization Sırası Değişti**
   - Eski: resize → quantize(8) → flood-fill
   - Yeni: resize → flood-fill → island remove → quantize(12)
   - Quantization en son, kenar renklerini bozmadan

5. **✅ 8 → 12 Colors + Feature Detayları**
   - `Max 8 colors` → `Max 12 colors` (daha fazla detay)
   - "zipper line, collar, earmuff pads, eyes (2px), mouth (1-2px)" zorunlu

6. **✅ Ayakkabı: Hue-Preserving Lighten**
   - Zorla parlak mor yerine (`#9B30FF`), aynı hue'nun açık tonu
   - `brightness < 100` ise: `factor = 140 / brightness`
   - Palette uyumu korunuyor

7. **✅ Mask Kullanılmıyor**
   - Sadece `background: 'transparent'`, `output_format: 'png'`, `quality: 'high'`, `input_fidelity: 'high'`

---

## 📋 ADIM ADIM SÜREÇ (v4.0)

### STEP 1: Vision Analysis (GPT-4o)

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

**Default Palette:**
```json
{
  "hair": "#2A1B16",
  "skin": "#F3B38D",
  "jacket": "#F2F2F2",
  "pants": "#111316",
  "shoes": "#9B30FF"
}
```

**Shoes Lightening (Hue-Preserving):**
```javascript
if (shoesBrightness < 100) {
  const factor = 140 / shoesBrightness  // Target: 140
  newR = Math.min(255, Math.round(r * factor))
  newG = Math.min(255, Math.round(g * factor))
  newB = Math.min(255, Math.round(b * factor))
  // Preserves hue, increases lightness
}
```

---

### STEP 2: DALL-E Image Generation (OpenAI Images API)

**API:** `openai.images.edit`  
**Model:** `gpt-image-1`  
**Size:** `1024x1024`  
**Parameters:**
- `background: 'transparent'`
- `output_format: 'png'`
- `quality: 'high'`
- `input_fidelity: 'high'`
- **NO MASK** (removed)

**Final Prompt (NO 1000 CHAR LIMIT):**

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
- SHOES: BRIGHT/VISIBLE accent color, clearly distinct from pants.

COLOR HARMONY (CRITICAL - use extracted palette):
- ONLY use these 6 flat colors + black outline:
  1) Outline: #000000
  2) Skin: ${colorPalette.skin}
  3) Hair: ${colorPalette.hair}
  4) Jacket: ${colorPalette.jacket}
  5) Pants: ${colorPalette.pants}
  6) Shoes: ${colorPalette.shoes}

Forbidden colors: neon green, neon lime, cyan glow.

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
Max 12 colors total (including black outline).
Transparent background only.
CRITICAL FEATURES (must be readable): zipper line, collar, earmuff pads, eyes (2 pixels), small mouth (1-2 pixels).
```

#### C) User Prompt (optional):
```
User constraints: ${userPrompt}
```

**Total Length:** Unlimited (was 1000 chars max)

---

### STEP 3: Post-Processing (v4.0 - NEW ORDER)

#### 3.1) Resize to 64x64 (NO quantization yet)
```javascript
sharp(aiImageBuffer)
  .resize(64, 64, {
    kernel: 'nearest',
    fit: 'contain',
    position: 'center',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()  // Full color depth
  .toBuffer()
```

#### 3.2) Alpha Transparency Check (DEBUG)
```javascript
// Count alpha=0 pixels
alphaZeroRatio = alphaZeroCount / totalPixels

if (alphaZeroRatio > 0.30) {
  // ✅ Background is TRANSPARENT - if you see black, it's UI/CSS
} else if (alphaZeroRatio < 0.05) {
  // ❌ Background is OPAQUE - flood-fill needed
} else {
  // ⚠️  Partial transparency (5-30%)
}
```

#### 3.3) Edge-Major-Color Flood-Fill
**New Algorithm (v4.0):**

1. **Find most common edge color:**
   ```javascript
   // Sample all 4 edges (top, bottom, left, right)
   edgeColors = Map<"r,g,b", count>
   bgColor = most common edge color
   ```

2. **Flood fill with color distance:**
   ```javascript
   colorDistance = sqrt((r-bgR)^2 + (g-bgG)^2 + (b-bgB)^2)
   
   if (colorDistance < 40) {
     toRemove.add(pixel)
     continue flood to neighbors
   }
   ```

**Advantages:**
- ✅ Works for ANY background (black, beige, gray, etc.)
- ✅ No manual threshold tuning
- ✅ Adaptive to each image

#### 3.4) Island Removal
Remove 1-3 pixel isolated regions (noise).

#### 3.5) Palette Quantization (LAST STEP - NEW!)
```javascript
sharp(cleanedBuffer)
  .png({ palette: true, colors: 12, dither: 0 })
  .toBuffer()
```

**Why last?**
- Doesn't interfere with edge color detection
- Cleaner quantization after background removal

---

## 📊 KEY METRICS & DEBUG

### Alpha Transparency Ratio
```
alphaZeroRatio > 30%  → Background is transparent
alphaZeroRatio < 5%   → Background is opaque (needs flood-fill)
alphaZeroRatio 5-30%  → Partial transparency
```

### Flood-Fill Stats
```
Edge major color: rgb(X, Y, Z) (N pixels)
Removed M background pixels via flood-fill
```

### Color Quantization
```
12 colors max (was 8)
No dithering
Applied AFTER flood-fill (was BEFORE)
```

---

## 🎨 COLOR STRATEGY (v4.0)

### 1. Vision-Based Extraction
- GPT-4o extracts 5 hex colors from photo
- Shoes: If too dark (`brightness < 100`), lighten while preserving hue

### 2. DALL-E Discipline
- Prompt includes exact hex codes
- "ONLY use these 6 flat colors"
- 12 colors allowed (increased from 8 for detail)

### 3. Post-Processing Quantization
- Applied LAST (after flood-fill)
- 12 colors → maintains feature detail
- No dithering → crisp pixels

---

## 🐛 TROUBLESHOOTING (v4.0)

### "Siyah fon var"
**Debug:**
```bash
# Check log:
[AI Convert] 🔍 ALPHA TRANSPARENCY CHECK:
  - Alpha zero ratio: X%
```

**If `alphaZeroRatio > 30%`:**
- Background IS transparent
- Siyah görünen şey UI/CSS background (checkerboard koy)

**If `alphaZeroRatio < 5%`:**
- Background IS opaque
- Edge-major-color flood-fill çalışmalı
- "Edge major color: rgb(...)" log'unu kontrol et

### "Renkler yanlış"
**Check:**
```bash
[AI Convert] ✅ Extracted palette: {...}
```
- Vision failed mi? → Default palette kullanılıyor
- Shoes lightened mi? → `brightness < 100` threshold'u kontrol et

### "Detay az"
- `Max 12 colors` kullanılıyor mu? (was 8)
- "CRITICAL FEATURES (must be readable)" prompt'ta var mı?
- Quantization en son uygulanıyor mu?

---

## 📁 FILES

- **API:** `/app/api/ai/convert-image/route.ts` (~600 lines)
- **Frontend:** `/components/CustomDesignEditor.tsx`
- **Product:** `/app/products/[slug]/page.tsx`
- **Env:** `.env.local` (OPENAI_API_KEY, REPLICATE_API_TOKEN)

---

## ✅ v4.0 CHECKLIST

- [x] 1000 char limit removed
- [x] Alpha transparency debug added
- [x] Edge-major-color flood-fill implemented
- [x] Quantization moved to LAST step
- [x] 8 → 12 colors + feature details
- [x] Shoes: hue-preserving lighten (no forced purple)
- [x] Mask removed (already was)

---

## 🧪 TEST

```bash
# Server:
http://localhost:3200

# Product Page:
http://localhost:3200/products/premium-tisort

# API Direct:
curl -X POST http://localhost:3200/api/ai/convert-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "data:image/png;base64,...", "prompt": "test"}'

# Check Logs:
tail -100 /tmp/server-v4.0.log | grep -E "(ALPHA|Edge major color|Extracted palette)"
```

---

## 📈 PERFORMANCE

**Typical Processing Time:**
- Vision Analysis: ~2-3s
- DALL-E Generation: ~15-20s
- Post-Processing: ~2-3s (quantization now last)
- **Total: ~19-26s**

**API Cost:**
- GPT-4o Vision: $0.002
- DALL-E gpt-image-1: $0.04
- **Total: ~$0.042/conversion**

---

**Last Updated:** 2026-01-18 (v4.0 - Major Refactor)
