import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mock products data with colored t-shirt mockups using placeholder service
const MOCK_PRODUCTS: any = {
  'premium-tisort': {
    id: '1',
    name: 'Premium Tişört',
    slug: 'premium-tisort',
    description: 'Yüksek kaliteli %100 pamuklu tişört. Kişiye özel tasarımlar için mükemmel.',
    basePrice: '199.99',
    category: 'TSHIRT',
    images: [
      '/white-tshirt.png',
    ],
    isActive: true,
    variants: [
      {
        id: 'v1',
        color: 'Beyaz',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
      {
        id: 'v2',
        color: 'Siyah',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
      {
        id: 'v3',
        color: 'Mavi',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
      {
        id: 'v4',
        color: 'Kırmızı',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
      {
        id: 'v5',
        color: 'Lacivert',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
      {
        id: 'v6',
        color: 'Sarı',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
      {
        id: 'v7',
        color: 'Beyaz',
        size: 'L',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
      {
        id: 'v8',
        color: 'Siyah',
        size: 'L',
        additionalPrice: '0',
        stock: 10,
        image: '/white-tshirt.png',
      },
    ],
  },
  'premium-sweatshirt': {
    id: '2',
    name: 'Premium Sweatshirt',
    slug: 'premium-sweatshirt',
    description: 'Kaliteli sweatshirt. Kişiye özel baskılar için ideal.',
    basePrice: '299.99',
    category: 'SWEATSHIRT',
    images: [],
    isActive: true,
    variants: [
      {
        id: 'v5',
        color: 'Gri',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
      },
      {
        id: 'v6',
        color: 'Lacivert',
        size: 'L',
        additionalPrice: '0',
        stock: 10,
      },
    ],
  },
  'premium-hoodie': {
    id: '3',
    name: 'Premium Hoodie',
    slug: 'premium-hoodie',
    description: 'Kapüşonlu sweatshirt. AI destekli tasarımlar için harika.',
    basePrice: '349.99',
    category: 'HOODIE',
    images: [],
    isActive: true,
    variants: [
      {
        id: 'v7',
        color: 'Siyah',
        size: 'M',
        additionalPrice: '0',
        stock: 10,
      },
      {
        id: 'v8',
        color: 'Gri',
        size: 'XL',
        additionalPrice: '0',
        stock: 10,
      },
    ],
  },
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    // Next.js 15: params is a Promise
    const { slug } = await context.params

    try {
      // Try database first
      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          variants: {
            orderBy: [
              { color: 'asc' },
              { size: 'asc' },
            ],
          },
        },
      })

      if (!product || !product.isActive) {
        throw new Error('Product not found in database')
      }

      // Analytics kaydı oluştur
      try {
        await prisma.analytics.create({
          data: {
            sessionId: req.headers.get('x-session-id') || `session-${Date.now()}`,
            page: `/products/${slug}`,
            event: 'product_view',
            eventData: {
              productId: product.id,
              productName: product.name,
            },
          },
        })
      } catch (analyticsError) {
        // Analytics hatası önemli değil, devam et
        console.log('[Product Detail] Analytics error:', analyticsError)
      }

      return NextResponse.json({
        success: true,
        product,
      })
    } catch (dbError) {
      // Database not available, use mock data
      console.log('[Product Detail] Database not available, using mock data')
      
      const product = MOCK_PRODUCTS[slug]
      
      if (!product) {
        return NextResponse.json(
          { error: 'Ürün bulunamadı' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        product,
      })
    }
  } catch (error: any) {
    console.error('Product detail API error:', error)
    return NextResponse.json(
      { error: error.message || 'Ürün detayı getirilemedi' },
      { status: 500 }
    )
  }
}
