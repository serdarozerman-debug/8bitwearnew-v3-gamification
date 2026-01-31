import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { shareCode } = await context.params

    const design = await prisma.savedDesign.findUnique({
      where: { shareCode },
    })

    if (!design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // Increment view count
    await prisma.savedDesign.update({
      where: { shareCode },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      design: {
        id: design.id,
        shareCode: design.shareCode,
        productType: design.productType,
        productColor: design.productColor,
        productAngle: design.productAngle,
        mockupImage: design.mockupImage,
        previewImage: design.previewImage,
        designElements: design.designElements,
        viewCount: design.viewCount + 1,
        createdAt: design.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Get design error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load design' },
      { status: 500 }
    )
  }
}
