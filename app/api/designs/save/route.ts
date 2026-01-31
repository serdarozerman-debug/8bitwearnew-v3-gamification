import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import sharp from 'sharp'

// Generate unique 6-character share code
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(req: NextRequest) {
  try {
    const {
      productType,
      productColor,
      productAngle,
      mockupImage,
      previewImageBase64, // PNG screenshot as base64
      designElements,
    } = await req.json()

    if (!productType || !mockupImage || !previewImageBase64 || !designElements) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique share code
    let shareCode = generateShareCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await prisma.savedDesign.findUnique({
        where: { shareCode },
      })
      if (!existing) break
      shareCode = generateShareCode()
      attempts++
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Could not generate unique share code' },
        { status: 500 }
      )
    }

    // TODO: Upload previewImageBase64 to cloud storage (Vercel Blob, S3, etc.)
    // For now, just store the base64 directly (not ideal for production!)
    const previewImage = previewImageBase64

    // Save to database
    const savedDesign = await prisma.savedDesign.create({
      data: {
        shareCode,
        productType,
        productColor: productColor || 'white',
        productAngle: productAngle || 'front',
        mockupImage,
        previewImage,
        designElements,
      },
    })

    // Generate shareable URL
    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://8bitwearnew.vercel.app'}/designs/${shareCode}`

    return NextResponse.json({
      success: true,
      shareCode,
      shareUrl,
      designId: savedDesign.id,
    })
  } catch (error: any) {
    console.error('Save design error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save design' },
      { status: 500 }
    )
  }
}
