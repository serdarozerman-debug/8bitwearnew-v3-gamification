import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Tarih aralığı
    const dateFilter = {
      createdAt: {
        gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lte: endDate ? new Date(endDate) : new Date(),
      },
    }

    // Genel istatistikler
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count({ where: dateFilter }),
      prisma.order.aggregate({
        where: {
          ...dateFilter,
          paymentStatus: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: {
          ...dateFilter,
          status: {
            in: ['PENDING_PAYMENT', 'PAID', 'AI_GENERATION', 'AWAITING_APPROVAL'],
          },
        },
      }),
      prisma.order.count({
        where: {
          ...dateFilter,
          status: 'DELIVERED',
        },
      }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: dateFilter.createdAt,
        },
      }),
      prisma.order.findMany({
        where: dateFilter,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // Günlük satışlar
    const dailySales = await prisma.$queryRaw<Array<{ date: Date; count: number; revenue: number }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as count,
        SUM(total_amount)::float as revenue
      FROM orders
      WHERE created_at >= ${dateFilter.createdAt.gte}
        AND created_at <= ${dateFilter.createdAt.lte}
        AND payment_status = 'COMPLETED'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `

    // Trafik kaynakları
    const trafficSources = await prisma.analytics.groupBy({
      by: ['trafficSource'],
      where: {
        timestamp: dateFilter.createdAt,
        trafficSource: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          trafficSource: 'desc',
        },
      },
      take: 10,
    })

    // UTM kampanya analizi
    const campaigns = await prisma.analytics.groupBy({
      by: ['utmCampaign'],
      where: {
        timestamp: dateFilter.createdAt,
        utmCampaign: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          utmCampaign: 'desc',
        },
      },
      take: 10,
    })

    // En çok satan ürünler
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: dateFilter.createdAt,
          paymentStatus: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    })

    // Ürün detaylarını ekle
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, images: true },
        })
        return {
          ...item,
          product,
        }
      })
    )

    // Sipariş durumları dağılımı
    const orderStatusDistribution = await prisma.order.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: true,
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        pendingOrders,
        completedOrders,
        totalCustomers,
        averageOrderValue: totalOrders > 0 
          ? Number(totalRevenue._sum.totalAmount || 0) / totalOrders 
          : 0,
      },
      charts: {
        dailySales,
        trafficSources,
        campaigns,
        topProducts: topProductsWithDetails,
        orderStatusDistribution,
      },
      recentOrders,
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: error.message || 'Dashboard verileri getirilemedi' },
      { status: 500 }
    )
  }
}
