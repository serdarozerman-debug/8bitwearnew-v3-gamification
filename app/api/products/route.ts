import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock data for development when database is not available
const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Premium Tişört',
    slug: 'premium-tisort',
    description: 'Yüksek kaliteli %100 pamuklu tişört. Kişiye özel tasarımlar için mükemmel.',
    basePrice: '199.99',
    category: 'TSHIRT',
    images: ['/white-tshirt.png'],
    isActive: true,
    variants: [
      {
        id: 'v1',
        color: 'Beyaz',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
      },
      {
        id: 'v2',
        color: 'Siyah',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
      },
      {
        id: 'v3',
        color: 'Beyaz',
        size: 'L',
        additionalPrice: '0',
        stock: 10,
      },
    ],
  },
  {
    id: '2',
    name: 'Premium Sweatshirt',
    slug: 'premium-sweatshirt',
    description: 'Kaliteli sweatshirt. Kişiye özel baskılar için ideal.',
    basePrice: '299.99',
    category: 'SWEATSHIRT',
    images: ['/white-tshirt.png'],
    isActive: true,
    variants: [
      {
        id: 'v4',
        color: 'Gri',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
      },
      {
        id: 'v5',
        color: 'Lacivert',
        size: 'L',
        additionalPrice: '0',
        stock: 10,
      },
    ],
  },
  {
    id: '3',
    name: 'Premium Hoodie',
    slug: 'premium-hoodie',
    description: 'Kapüşonlu sweatshirt. AI destekli tasarımlar için harika.',
    basePrice: '349.99',
    category: 'HOODIE',
    images: ['/white-tshirt.png'],
    isActive: true,
    variants: [
      {
        id: 'v6',
        color: 'Siyah',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
      },
      {
        id: 'v7',
        color: 'Gri',
        size: 'XL',
        additionalPrice: '0',
        stock: 10,
      },
    ],
  },
]

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
    }

    if (category && category !== 'all') {
      where.category = category.toUpperCase()
    }

    try {
      // Try database first
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            variants: {
              where: {
                stock: {
                  gt: 0,
                },
              },
              select: {
                id: true,
                color: true,
                size: true,
                additionalPrice: true,
                stock: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.product.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return NextResponse.json({
        success: true,
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    } catch (dbError) {
      // Database not available, use mock data
      console.log('[Products API] Database not available, using mock data')
      
      let products = MOCK_PRODUCTS
      
      if (category && category !== 'all') {
        products = MOCK_PRODUCTS.filter(
          p => p.category.toLowerCase() === category.toLowerCase()
        )
      }

      const total = products.length
      const totalPages = Math.ceil(total / limit)
      const paginatedProducts = products.slice(skip, skip + limit)

      return NextResponse.json({
        success: true,
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    }
  } catch (error: any) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: error.message || 'Ürünler getirilemedi' },
      { status: 500 }
    )
  }
}
