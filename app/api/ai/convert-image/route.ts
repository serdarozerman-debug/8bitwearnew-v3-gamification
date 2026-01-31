import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Next.js App Router body size config (10MB)
export const runtime = 'nodejs'
export const maxDuration = 120 // 120 seconds max
export const dynamic = 'force-dynamic'

const openaiKey = process.env.OPENAI_API_KEY
const replicateToken = process.env.REPLICATE_API_TOKEN

const openai = new OpenAI({
  apiKey: openaiKey,
  maxRetries: 3,
  timeout: 120000, // 120 seconds for image processing
})

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, prompt, provider } = await req.json()

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'imageUrl and prompt are required' },
        { status: 400 }
      )
    }

    if (!openaiKey && !replicateToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI sağlayıcısı yapılandırılmamış (OPENAI_API_KEY veya REPLICATE_API_TOKEN gerekli)',
        },
        { status: 500 }
      )
    }

    if (provider === 'replicate' && !replicateToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Replicate kullanılamıyor: REPLICATE_API_TOKEN eksik',
        },
        { status: 400 }
      )
    }

    console.log('[AI Convert] Starting IMAGE-TO-IMAGE transformation using OpenAI Images API...')
    console.log('[AI Convert] Input image size:', imageUrl.length, 'bytes')

    // Dynamic import sharp for Next.js compatibility
    const sharp = (await import('sharp')).default
    
    // Base64 data URL'i buffer'a çevir
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '')
    const inputBuffer = Buffer.from(base64Data, 'base64')
    
    console.log('[AI Convert] Converting to PNG format...')
    
    // Sharp ile PNG'ye çevir ve 4MB altına düşür
    const pngBuffer = await sharp(inputBuffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .png()
      .toBuffer()
    
    // PNG metadata'yı al (boyut için)
    const metadata = await sharp(pngBuffer).metadata()
    const width = metadata.width || 1024
    const height = metadata.height || 1024
    
    console.log('[AI Convert] PNG created, size:', pngBuffer.length, 'bytes', `${width}x${height}`)
    
    // PNG File objesi oluştur (Buffer'ı Uint8Array'e dönüştür)
    const imageFile = new File([new Uint8Array(pngBuffer)], 'input.png', { type: 'image/png' })
    
    console.log('[AI Convert] Image file ready, no mask needed (using transparent background)')

    // STEP 1: Vision Analysis - Extract colors from photo (GENERIC)
    console.log('[AI Convert] Step 1: Analyzing image colors with GPT-4o Vision...')
    
    const visionPrompt = `Analyze this photo and identify the 5 dominant colors for a pixel art sprite.

Return ONLY a JSON (no other text):
{
  "hair": "#HEX",
  "skin": "#HEX",
  "topGarment": "#HEX",
  "bottomGarment": "#HEX",
  "footwear": "#HEX"
}

Rules:
- Look at the ACTUAL pixel colors in the photo
- hair: main hair/head color (if hat, use hat color)
- skin: face/exposed skin tone
- topGarment: upper body clothing color (shirt, jacket, hoodie, dress top, whatever they're wearing)
- bottomGarment: lower body clothing color (pants, skirt, shorts, dress bottom)
- footwear: shoes, boots, sneakers, or if not visible, use a contrasting accent color
- Use realistic colors from photo, NOT neon or oversaturated
- If a garment is near-white (cream, beige, off-white), note it but keep the real color
- Example: white shirt → "#FAFAFA" (will be snapped to #FFFFFF in post-processing)

Return ONLY the JSON with 5 hex colors.`

    let colorPalette = {
      hair: '#2A1B16',
      skin: '#F3B38D',
      topGarment: '#F2F2F2',
      bottomGarment: '#111316',
      footwear: '#9B30FF'  // Default: BRIGHT PURPLE for visibility
    }

    try {
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 100
      })

      const visionText = visionResponse.choices[0]?.message?.content?.trim() || ''
      console.log('[AI Convert] Vision raw:', visionText)

      // Parse JSON
      const jsonMatch = visionText.match(/\{[^}]+\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.hair && parsed.skin && parsed.topGarment && parsed.bottomGarment && parsed.footwear) {
          colorPalette = parsed
          
          // COLOR SNAPPING: Near-white → Pure White, Near-black → Pure Black
          const snapColorToPure = (hexColor: string, colorName: string): string => {
            const r = parseInt(hexColor.slice(1, 3), 16)
            const g = parseInt(hexColor.slice(3, 5), 16)
            const b = parseInt(hexColor.slice(5, 7), 16)
            const brightness = (r + g + b) / 3
            
            // Near-white (>220 brightness, low saturation) → PURE WHITE
            if (brightness > 220 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
              console.log(`[AI Convert] ⚪ ${colorName} near-white (${hexColor}) → #FFFFFF`)
              return '#FFFFFF'
            }
            
            // Near-black (<35 brightness) → PURE BLACK
            if (brightness < 35) {
              console.log(`[AI Convert] ⚫ ${colorName} near-black (${hexColor}) → #000000`)
              return '#000000'
            }
            
            return hexColor
          }
          
          // Apply color snapping to garments (most likely to be near-white/black)
          colorPalette.topGarment = snapColorToPure(colorPalette.topGarment, 'Top Garment')
          colorPalette.bottomGarment = snapColorToPure(colorPalette.bottomGarment, 'Bottom Garment')
          
          // LIGHTEN FOOTWEAR if too dark (preserve hue, increase lightness)
          const footwearR = parseInt(colorPalette.footwear.slice(1, 3), 16)
          const footwearG = parseInt(colorPalette.footwear.slice(3, 5), 16)
          const footwearB = parseInt(colorPalette.footwear.slice(5, 7), 16)
          const footwearBrightness = (footwearR + footwearG + footwearB) / 3
          
          if (footwearBrightness < 100) {
            // Too dark - increase lightness while preserving hue
            const factor = 140 / footwearBrightness  // Target brightness: 140
            const newR = Math.min(255, Math.round(footwearR * factor))
            const newG = Math.min(255, Math.round(footwearG * factor))
            const newB = Math.min(255, Math.round(footwearB * factor))
            colorPalette.footwear = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
            console.log(`[AI Convert] ⚠️ Footwear too dark, lightened: ${colorPalette.footwear}`)
          }
          
          console.log('[AI Convert] ✅ Extracted palette (after snapping):', colorPalette)
        }
      }
    } catch (visionError: any) {
      console.log('[AI Convert] ⚠️ Vision failed, using defaults:', visionError.message)
    }

    // STEP 2: Build STRICT prompt with extracted palette (GENERIC - works for ANY photo)
    const standardPrompt = `Create a STRICT retro pixel-art sprite of the PERSON in the input photo.

TARGET LOOK:
- 64x64 sprite style, but generate at 1024x1024 as an UPSCALED pixel sprite (nearest-neighbor look).
- Pixels must appear as big crisp square blocks (no anti-aliasing, no smoothing).

SCALE & PROPORTIONS (CRITICAL):
- Character must fill ~80% of canvas height (big sprite, not tiny).
- Head-to-body ratio: 1:1.5 (VERY BIG head, bigger than body - exaggerated chibi for facial detail).
- Head should be ~32-36px high in the 64x64 grid look.

COLOR RULES (CRITICAL - VIBRANT & CLEAN):
- Use VIBRANT, SATURATED, BOLD colors
- Near-white colors (cream, beige, off-white, #F0F0F0+) → PURE WHITE #FFFFFF
- Near-black colors (dark gray #303030-) → PURE BLACK #000000  
- Avoid muted/pastel/washed-out tones
- Each color should be BRIGHT and DISTINCT

KEEP THESE FEATURES FROM PHOTO (must be visible):
- HAIR: SINGLE SOLID ROUNDED BLOB (NO individual strands, NO texture, NO spiky edges, COMPLETELY smooth rounded mass).
- Top garment (shirt/jacket/hoodie/whatever person is wearing): Simple solid shape, main details only (collar/zipper if present).
- Bottom garment (pants/skirt/shorts): Simple solid shape.
- Footwear (shoes/boots/sneakers): Clearly visible, distinct color from bottom garment.
- Any visible accessories (hat/glasses/etc.): Simplified to basic shapes.
- Body parts clearly separated by black outline.

FACIAL FEATURES (CRITICAL - BIGGER HEAD = MORE DETAIL):
- Eyes: 2-3 pixels each, clearly visible dots
- Mouth: 2-3 pixels, simple smile or line
- Eyebrows: optional 1-2 pixels if space allows
- Facial features must be READABLE even at 64x64

COLOR HARMONY (use extracted palette BUT make vibrant):
- ONLY use these 6 flat colors + black outline:
  1) Outline: #000000 (pure black)
  2) Skin: ${colorPalette.skin}
  3) Hair: ${colorPalette.hair}
  4) Top garment: ${colorPalette.topGarment}
  5) Bottom garment: ${colorPalette.bottomGarment}
  6) Footwear: ${colorPalette.footwear}

Forbidden colors: muted gray, dull beige, washed-out pastels, neon green, neon lime.

SHAPES & RULES:
- Flat colors only, no gradients, no shading, no texture.
- Hair MUST be ONE SOLID SMOOTH BLOB (think: helmet shape, egg shape, rounded mass).
- Clean black outline around character and between major parts.
- Keep POSE from input photo (sitting/standing/arms position/etc.).
- Keep SILHOUETTE recognizable from input photo.
- Centered, full body visible.
- Background FULLY transparent (no ground, shadow, scenery, NO BLACK BACKGROUND - ONLY alpha channel).
- CRITICAL: BLACK BACKGROUND IS ABSOLUTELY FORBIDDEN. Use ONLY transparent alpha channel for background.`

    // PIXEL LOCK - Force crisp pixel rendering
    const pixelLock = `Render as 64x64 sprite then upscale to 1024x1024 using nearest-neighbor for big crisp squares.
No anti-aliasing, no smoothing.
Max 12 colors total (including black outline).
Transparent background only.
CRITICAL FEATURES (must be readable): zipper line, collar, earmuff pads, eyes (2 pixels), small mouth (1-2 pixels).`

    // USER PROMPT (from frontend)
    const userPrompt = typeof prompt === 'string' ? prompt.trim() : ''

    // COMBINE ALL PROMPTS (NO LENGTH LIMIT - critical parts must not be cut)
    const finalPrompt = [
      standardPrompt,
      pixelLock,
      userPrompt ? `User constraints: ${userPrompt}` : '',
    ].filter(Boolean).join('\n\n')

    console.log('[AI Convert] ===== PROMPT (len:', finalPrompt.length, ') =====')
    console.log(finalPrompt.substring(0, 500) + '\n...\n' + finalPrompt.substring(Math.max(0, finalPrompt.length - 300)))
    console.log('[AI Convert] ===== END PROMPT =====')

    const preferReplicate = provider === 'replicate'
    let convertedImageUrl: string | null = null
    let providerUsed: 'openai-edit' | 'replicate' | 'fallback-direct' | '' = ''

    // Common helper: Replicate fallback (SDXL image-to-image)
    const tryReplicate = async (): Promise<string | null> => {
      try {
        if (!replicateToken) {
          console.warn('[AI Convert] Replicate token not configured, skipping replicate fallback')
          return null
        }

        // SDXL image-to-image model version (stability-ai/sdxl image-to-image)
        const modelVersion =
          process.env.REPLICATE_SDXL_VERSION ||
          'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a089f5b1c712de7dfd16655c0cd860e19fd5d7151a'

        const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`

        console.log('[AI Convert] 🔵 Replicate: Starting request...')
        console.log('[AI Convert] 🔵 Model:', modelVersion)
        console.log('[AI Convert] 🔵 Image size:', dataUri.length, 'bytes')
        
        const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${replicateToken}`,
        },
        body: JSON.stringify({
          version: modelVersion,
          input: {
            prompt: finalPrompt + ' Single figure centered.',
            negative_prompt:
              'two people, multiple characters, duplicate, twins, crowd, extra person, clone, mirror, shading, gradients, blur, background, text, watermark, lighting effects, realistic details, strands, texture',
            image: dataUri,
            num_outputs: 1,
            num_inference_steps: 28,
            guidance_scale: 6.5, // Düşürdük (çoğaltma riski azalır)
            strength: 0.75, // Biraz düşürdük
            output_format: 'png',
          },
        }),
      })

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => 'Could not read error')
        console.error('[AI Convert] ❌ Replicate create failed!')
        console.error('[AI Convert] ❌ Status:', createRes.status, createRes.statusText)
        console.error('[AI Convert] ❌ Response:', errText.substring(0, 500))
        return null
      }

      const createJson: any = await createRes.json()
      const predictionId = createJson?.id
      if (!predictionId) {
        console.warn('[AI Convert] Replicate create missing id')
        return null
      }

      // Poll prediction
      const pollUrl = `https://api.replicate.com/v1/predictions/${predictionId}`
      const maxAttempts = 15
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

      for (let i = 0; i < maxAttempts; i++) {
        const pollRes = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${replicateToken}` },
        })
        if (!pollRes.ok) {
          console.warn('[AI Convert] Replicate poll failed:', pollRes.status)
          return null
        }
        const pollJson: any = await pollRes.json()
        console.log(`[AI Convert] 🔵 Poll attempt ${i + 1}/${maxAttempts}, status: ${pollJson?.status}`)
        
        if (pollJson?.status === 'succeeded') {
          const out = pollJson.output?.[0]
          if (out) {
            console.log('[AI Convert] ✅ Replicate SUCCESS! Output URL:', out.substring(0, 80) + '...')
            return out as string
          }
          console.warn('[AI Convert] ⚠️ Replicate succeeded but no output URL')
          return null
        }
        if (pollJson?.status === 'failed' || pollJson?.status === 'canceled') {
          console.error('[AI Convert] ❌ Replicate failed status:', pollJson?.status)
          console.error('[AI Convert] ❌ Error details:', pollJson?.error || 'No error message')
          return null
        }
        await delay(1500)
      }

      console.warn('[AI Convert] ⚠️ Replicate timed out after', maxAttempts, 'attempts')
      return null
    } catch (replicateError: any) {
      console.error('[AI Convert] ❌ Replicate exception:', replicateError)
      console.error('[AI Convert] ❌ Error details:', {
        message: replicateError.message,
        name: replicateError.name,
        stack: replicateError.stack?.substring(0, 200)
      })
      return null
    }
    }

    // 1) If requested, try Replicate first
    if (preferReplicate) {
      convertedImageUrl = await tryReplicate()
      if (convertedImageUrl) providerUsed = 'replicate'
    }

    // 2) OpenAI edit with image+mask (primary path when available)
    if (!convertedImageUrl && openaiKey) {
      try {
        console.log('[AI Convert] Calling OpenAI Images API edit (gpt-image-1, img2img, NO MASK)...')
        const editResponse = await openai.images.edit({
          model: 'gpt-image-1',
          image: imageFile,
          prompt: finalPrompt,
          size: '1024x1024',
          n: 1,
        })

        const choice = editResponse.data?.[0]
        if (choice?.url) {
          convertedImageUrl = choice.url
        } else if (choice?.b64_json) {
          convertedImageUrl = `data:image/png;base64,${choice.b64_json}`
        } else {
          convertedImageUrl = null
        }
        if (convertedImageUrl) providerUsed = 'openai-edit'
      } catch (err: any) {
        console.warn('[AI Convert] OpenAI edit failed, will try Replicate...', err?.message || err)
      }
    }

    // 3) Replicate fallback if OpenAI path failed
    if (!convertedImageUrl) {
      convertedImageUrl = await tryReplicate()
      if (convertedImageUrl) providerUsed = 'replicate'
    }

    // 4) FALLBACK: Use input image directly if AI providers fail
    if (!convertedImageUrl) {
      console.log('[AI Convert] ⚠️ AI providers failed, using input image as fallback')
      // Convert input buffer to base64
      const fallbackBase64 = pngBuffer.toString('base64')
      convertedImageUrl = `data:image/png;base64,${fallbackBase64}`
      providerUsed = 'fallback-direct'
    }

    console.log('[AI Convert] ✅ SUCCESS! Image-to-image transformation completed')
    console.log('[AI Convert] Output URL:', convertedImageUrl)

    // POST-PROCESSING: Convert to true 64x64 pixel art with nearest-neighbor
    console.log('[AI Convert] Post-processing: Converting to 64x64 pixel art...')
    let finalImageUrl = convertedImageUrl

    try {
      // Download the AI output
      const aiImageRes = await fetch(convertedImageUrl.startsWith('data:') 
        ? convertedImageUrl 
        : convertedImageUrl)
      
      let aiImageBuffer: Buffer
      if (convertedImageUrl.startsWith('data:image/png;base64,')) {
        // Already base64
        const b64 = convertedImageUrl.replace(/^data:image\/png;base64,/, '')
        aiImageBuffer = Buffer.from(b64, 'base64')
      } else {
        // Fetch from URL
        aiImageBuffer = Buffer.from(await aiImageRes.arrayBuffer())
      }

      // Resize to 64x64 with nearest-neighbor (NO quantization yet) + ENSURE ALPHA
      let pixelArtBuffer = await sharp(aiImageBuffer)
        .resize(64, 64, {
          kernel: 'nearest',
          fit: 'contain',  // Don't crop! Keep full character
          position: 'center',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
        })
        .ensureAlpha()  // CRITICAL: Preserve alpha channel
        .png()  // Keep full color depth for now (no palette yet)
        .toBuffer()

      console.log('[AI Convert] 64x64 resize complete (alpha preserved)')

      // DEBUG: Check alpha transparency BEFORE any processing
      const debugInfo = await sharp(pixelArtBuffer).raw().toBuffer({ resolveWithObject: true })
      let alphaZeroCount = 0
      const totalPixels = debugInfo.info.width * debugInfo.info.height
      if (debugInfo.info.channels === 4) {
        for (let i = 3; i < debugInfo.data.length; i += 4) {
          if (debugInfo.data[i] === 0) alphaZeroCount++
        }
      }
      const alphaZeroRatio = alphaZeroCount / totalPixels
      console.log(`[AI Convert] 🔍 ALPHA TRANSPARENCY CHECK:`)
      console.log(`  - Total pixels: ${totalPixels}`)
      console.log(`  - Alpha=0 pixels: ${alphaZeroCount}`)
      console.log(`  - Alpha zero ratio: ${(alphaZeroRatio * 100).toFixed(1)}%`)
      if (alphaZeroRatio > 0.30) {
        console.log(`  ✅ Background is TRANSPARENT (>30%) - if you see black, it's UI/CSS background`)
      } else if (alphaZeroRatio < 0.05) {
        console.log(`  ❌ Background is OPAQUE (<5%) - flood-fill needed`)
      } else {
        console.log(`  ⚠️  Partial transparency (5-30%) - mixed background`)
      }

      // CLEANUP: Aggressive background removal + Island removal
      // Read pixel data
      const { data, info } = await sharp(pixelArtBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true })

      const width = info.width
      const height = info.height
      const channels = info.channels

      // Helper: Get pixel at (x, y)
      const getPixel = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return null
        const idx = (y * width + x) * channels
        return {
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          a: channels === 4 ? data[idx + 3] : 255,
        }
      }

      // Helper: Set pixel at (x, y)
      const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
        const idx = (y * width + x) * channels
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        if (channels === 4) data[idx + 3] = a
      }

      // CHECK TRANSPARENCY RATIO FIRST
      let transparentPixels = 0
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = getPixel(x, y)
          if (!p || p.a < 128) transparentPixels++
        }
      }
      const transparencyRatio = transparentPixels / (width * height)
      console.log(`[AI Convert] Current transparency: ${(transparencyRatio * 100).toFixed(1)}%`)

      // 0) SMART BACKGROUND REMOVAL: Only if transparency < 10%
      if (transparencyRatio < 0.10) {
        console.log('[AI Convert] Low transparency, applying MULTI-COLOR flood-fill...')
        
        // STEP 1: Find ALL edge colors (not just most common)
        const edgeColors = new Map<string, number>()
        
        // Sample all 4 edges
        for (let x = 0; x < width; x++) {
          const topPixel = getPixel(x, 0)
          const bottomPixel = getPixel(x, height - 1)
          if (topPixel && topPixel.a > 0) {
            const key = `${topPixel.r},${topPixel.g},${topPixel.b}`
            edgeColors.set(key, (edgeColors.get(key) || 0) + 1)
          }
          if (bottomPixel && bottomPixel.a > 0) {
            const key = `${bottomPixel.r},${bottomPixel.g},${bottomPixel.b}`
            edgeColors.set(key, (edgeColors.get(key) || 0) + 1)
          }
        }
        for (let y = 0; y < height; y++) {
          const leftPixel = getPixel(0, y)
          const rightPixel = getPixel(width - 1, y)
          if (leftPixel && leftPixel.a > 0) {
            const key = `${leftPixel.r},${leftPixel.g},${leftPixel.b}`
            edgeColors.set(key, (edgeColors.get(key) || 0) + 1)
          }
          if (rightPixel && rightPixel.a > 0) {
            const key = `${rightPixel.r},${rightPixel.g},${rightPixel.b}`
            edgeColors.set(key, (edgeColors.get(key) || 0) + 1)
          }
        }
        
        // Find ALL edge colors (not just most common) - filter by count
        const bgColors: Array<{ r: number; g: number; b: number }> = []
        const minEdgeCount = Math.floor((width + height) * 0.3)  // At least 30% of one edge
        
        for (const [colorKey, count] of edgeColors) {
          if (count > minEdgeCount) {
            const [r, g, b] = colorKey.split(',').map(Number)
            bgColors.push({ r, g, b })
          }
        }
        
        // If no significant edge colors found, use ALL edge colors
        if (bgColors.length === 0) {
          for (const [colorKey, count] of edgeColors) {
            const [r, g, b] = colorKey.split(',').map(Number)
            bgColors.push({ r, g, b })
          }
        }
        
        console.log(`[AI Convert] Found ${bgColors.length} edge background colors:`)
        bgColors.forEach((c, i) => console.log(`  ${i + 1}) rgb(${c.r}, ${c.g}, ${c.b})`))
        
        // STEP 2: Flood fill from edges for ALL background colors
        const visited = new Set<string>()
        const toRemove = new Set<string>()
        const COLOR_THRESHOLD = 40
        
        const colorDistance = (p: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }) => {
          return Math.sqrt(
            Math.pow(p.r - bg.r, 2) +
            Math.pow(p.g - bg.g, 2) +
            Math.pow(p.b - bg.b, 2)
          )
        }
        
        const isBackgroundColor = (p: { r: number; g: number; b: number }) => {
          for (const bgColor of bgColors) {
            if (colorDistance(p, bgColor) < COLOR_THRESHOLD) {
              return true
            }
          }
          return false
        }
        
        const floodFill = (startX: number, startY: number) => {
          const stack: [number, number][] = [[startX, startY]]
          
          while (stack.length > 0) {
            const [x, y] = stack.pop()!
            const key = `${x},${y}`
            
            if (visited.has(key)) continue
            if (x < 0 || x >= width || y < 0 || y >= height) continue
            
            const p = getPixel(x, y)
            if (!p) continue
            
            visited.add(key)
            
            // Check if color matches ANY background color
            if (isBackgroundColor(p)) {
              toRemove.add(key)
              // Continue flooding to neighbors
              stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1])
            }
            // Otherwise it's character - stop flooding in this direction
          }
        }
      
      // Start flood fill from all 4 edges
      for (let x = 0; x < width; x++) {
        floodFill(x, 0)              // Top edge
        floodFill(x, height - 1)      // Bottom edge
      }
      for (let y = 0; y < height; y++) {
        floodFill(0, y)              // Left edge
        floodFill(width - 1, y)      // Right edge
      }
      
      // Remove marked pixels
      for (const key of toRemove) {
        const [x, y] = key.split(',').map(Number)
        setPixel(x, y, 0, 0, 0, 0)
      }
      
      console.log(`[AI Convert] Removed ${toRemove.size} background pixels via flood-fill`)
      } else {
        console.log('[AI Convert] Background already transparent (>10%), skipping flood-fill')
      }

      // 1) Island removal: Remove 1-3 pixel isolated regions
      console.log('[AI Convert] Removing pixel islands...')
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = getPixel(x, y)
          if (!p || p.a < 128) continue // Skip transparent

          // Check 4-neighbors
          const neighbors = [
            getPixel(x - 1, y),
            getPixel(x + 1, y),
            getPixel(x, y - 1),
            getPixel(x, y + 1),
          ]

          const solidNeighbors = neighbors.filter(n => n && n.a >= 128)
          
          // If isolated (0-1 neighbors), make transparent
          if (solidNeighbors.length <= 1) {
            setPixel(x, y, 0, 0, 0, 0)
          }
        }
      }

      // 2) Tone flattening: REMOVED - Sharp's palette quantization already handles this better

      // Write cleaned buffer back with FINAL palette quantization (LAST STEP)
      console.log('[AI Convert] Applying final palette quantization (12 colors) with alpha preserved...')
      pixelArtBuffer = await sharp(data, {
        raw: {
          width,
          height,
          channels,
        },
      })
        .ensureAlpha()  // CRITICAL: Ensure alpha before quantization
        .png({ palette: true, colors: 12, dither: 0 })  // 12 colors (was 8, increased for detail)
        .toBuffer()

      // FINAL ALPHA CHECK - Critical diagnostic
      console.log('[AI Convert] 🔬 FINAL BUFFER ALPHA STATS:')
      const finalStats = await sharp(pixelArtBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const finalTotal = finalStats.info.width * finalStats.info.height
      let finalAlphaZero = 0
      for (let i = 0; i < finalTotal; i++) {
        const a = finalStats.data[i * 4 + 3]
        if (a === 0) finalAlphaZero++
      }
      const finalAlphaZeroRatio = finalAlphaZero / finalTotal
      console.log(`  - ALPHA_ZERO_RATIO: ${(finalAlphaZeroRatio * 100).toFixed(2)}%`)
      
      if (finalAlphaZeroRatio > 0.10) {
        console.log(`  ✅ TRANSPARENCY EXISTS (>10%) - If you see black background, it's UI/CSS issue!`)
      } else if (finalAlphaZeroRatio < 0.01) {
        console.log(`  ❌ NO TRANSPARENCY (<1%) - Black pixels are REAL, pipeline issue!`)
      } else {
        console.log(`  ⚠️  PARTIAL TRANSPARENCY (1-10%) - Some background removed but not all`)
      }

      // Convert back to base64 data URL
      finalImageUrl = `data:image/png;base64,${pixelArtBuffer.toString('base64')}`
      console.log('[AI Convert] ✅ Post-processing complete: multi-color flood-fill + 12 color quantization')
    } catch (postErr: any) {
      console.warn('[AI Convert] Post-processing failed, returning original:', postErr?.message)
      // Keep original if post-processing fails
    }

    return NextResponse.json({
      success: true,
      convertedImageUrl: finalImageUrl,
      method: providerUsed || 'unknown',
      originalPrompt: prompt,
    })
  } catch (error: any) {
    console.error('[AI Convert] ❌ Error:', error)
    console.error('[AI Convert] Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    })

    if (error.code === 'content_policy_violation') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Görsel içeriği OpenAI politikalarına uygun değil',
          details: error.message,
        },
        { status: 400 }
      )
    }

    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        { 
          success: false,
          error: 'API limiti aşıldı, lütfen biraz bekleyin',
          details: error.message,
        },
        { status: 429 }
      )
    }

    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { 
          success: false,
          error: 'API key geçersiz',
          details: 'Lütfen OPENAI_API_KEY ortam değişkenini kontrol edin',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Görsel dönüştürülemedi',
        code: error.code,
        type: error.type,
      },
      { status: 500 }
    )
  }
}
