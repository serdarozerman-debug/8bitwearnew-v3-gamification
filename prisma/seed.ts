import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Veritabanı seed işlemi başlıyor...')

  // Admin kullanıcısı oluştur
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@8bitwear.com' },
    update: {},
    create: {
      email: 'admin@8bitwear.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin kullanıcısı oluşturuldu:', admin.email)

  // Örnek ürünler oluştur
  const products = [
    {
      name: 'Premium Pamuklu Tişört',
      slug: 'premium-pamuklu-tisort',
      description: 'Yüksek kaliteli %100 pamuk kumaş. 3D baskı için ideal yüzey. Günlük kullanım için rahat kesim.',
      basePrice: 299.99,
      category: 'TSHIRT',
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
      ],
    },
    {
      name: 'Klasik Sweatshirt',
      slug: 'klasik-sweatshirt',
      description: 'Kalın ve sıcak tutan sweatshirt. 3D baskı ve nakış için mükemmel. İç yüzeyi yumuşak pamuklu.',
      basePrice: 449.99,
      category: 'SWEATSHIRT',
      images: [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
      ],
    },
    {
      name: 'Kapüşonlu Hoodie',
      slug: 'kapusonlu-hoodie',
      description: 'Rahat kesim kapüşonlu sweatshirt. Cepli model. Kişiye özel tasarımlarınız için geniş yüzey alanı.',
      basePrice: 549.99,
      category: 'HOODIE',
      images: [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
      ],
    },
    {
      name: 'Oversize Tişört',
      slug: 'oversize-tisort',
      description: 'Bol kesim oversize tişört. Trend model. Büyük logo ve baskılar için ideal.',
      basePrice: 349.99,
      category: 'TSHIRT',
      images: [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
      ],
    },
  ]

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: {
        ...productData,
        isActive: true,
        category: productData.category as any, // TypeScript type fix
      },
    })
    console.log('✅ Ürün oluşturuldu:', product.name)

    // Her ürün için varyantlar oluştur
    const colors = ['Beyaz', 'Siyah', 'Lacivert', 'Gri']
    const sizes = ['S', 'M', 'L', 'XL', 'XXL']

    for (const color of colors) {
      for (const size of sizes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            color,
            size,
            sku: `${product.slug.toUpperCase()}-${color.toUpperCase()}-${size}`,
            stock: Math.floor(Math.random() * 50) + 10,
            additionalPrice: color === 'Beyaz' ? 0 : 20,
          },
        })
      }
    }
    console.log(`✅ ${colors.length * sizes.length} varyant oluşturuldu`)
  }

  // SEO içerikleri oluştur
  const seoPages = [
    {
      page: 'home',
      metaTitle: '8BitWear - Kişiye Özel 3D Baskılı Giysiler | AI Destekli Tasarım',
      metaDescription: 'Hayalinizdeki tasarımı AI ile gerçeğe dönüştürün. Kişiye özel 3D baskılı tişört, sweatshirt ve hoodie. Hızlı üretim, güvenli ödeme, kapınıza teslim.',
      keywords: ['3d baskı', 'kişiye özel tişört', 'ai tasarım', 'custom tshirt', 'sweatshirt', 'hoodie', 'online tasarım'],
    },
    {
      page: 'products',
      metaTitle: 'Ürünlerimiz - Kişiye Özel 3D Baskılı Giysiler | 8BitWear',
      metaDescription: 'Tişört, sweatshirt ve hoodie modellerimizi keşfedin. AI ile kişiselleştirin, benzersiz tasarımınızı oluşturun.',
      keywords: ['3d baskılı tişört', '3d baskılı sweatshirt', 'kişiye özel hoodie', 'online tişört tasarımı'],
    },
  ]

  for (const seoData of seoPages) {
    await prisma.sEOContent.upsert({
      where: { page: seoData.page },
      update: {},
      create: seoData,
    })
    console.log('✅ SEO içeriği oluşturuldu:', seoData.page)
  }

  console.log('🎉 Seed işlemi tamamlandı!')
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
