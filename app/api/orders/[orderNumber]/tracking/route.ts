import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoTracking } from '@/lib/cargo'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await context.params

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        trackingNumber: true,
        shippingProvider: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      )
    }

    if (!order.trackingNumber) {
      return NextResponse.json({
        status: order.status,
        message: 'Kargo takip numarası henüz oluşturulmadı',
      })
    }

    // Kargo takip bilgisini al
    const trackingInfo = await getCargoTracking(
      order.trackingNumber,
      order.shippingProvider || 'aras'
    )

    return NextResponse.json({
      success: true,
      tracking: trackingInfo,
      order: {
        status: order.status,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
      },
    })
  } catch (error: any) {
    console.error('Tracking API error:', error)
    return NextResponse.json(
      { error: error.message || 'Takip bilgisi alınamadı' },
      { status: 500 }
    )
  }
}
