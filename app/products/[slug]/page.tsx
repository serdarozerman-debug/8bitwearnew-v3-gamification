'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CustomDesignEditor from '@/components/CustomDesignEditorV3'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  description: string
  basePrice: string
  category: string
  images: string[]
  variants: Array<{
    id: string
    color: string
    size: string
    additionalPrice: string
    stock: number
    image?: string // Variant'a özel görsel
  }>
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [showEditor, setShowEditor] = useState(false)
  const [design, setDesign] = useState<any>(null)

  useEffect(() => {
    if (params.slug) {
      fetchProduct()
    }
  }, [params.slug])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products/${params.slug}`)
      const data = await response.json()
      if (data.success) {
        setProduct(data.product)
        if (data.product.variants.length > 0) {
          setSelectedVariant(data.product.variants[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
      toast.error('Ürün yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDesignSave = (designElements: any[]) => {
    setDesign(designElements)
    setShowEditor(false)
    toast.success('Tasarım kaydedildi! Şimdi sepete ekleyebilirsiniz.')
  }

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Lütfen bir varyant seçin')
      return
    }

    if (!design || design.length === 0) {
      toast.error('Lütfen önce tasarımınızı oluşturun')
      return
    }

    // TODO: Implement cart logic
    toast.success('Ürün sepete eklendi')
    router.push('/cart')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Ürün Bulunamadı</h1>
            <button
              onClick={() => router.push('/products')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Ürünlere Dön
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const selectedVariantData = product.variants.find(v => v.id === selectedVariant)
  const totalPrice = selectedVariantData
    ? parseFloat(product.basePrice) + parseFloat(selectedVariantData.additionalPrice)
    : parseFloat(product.basePrice)

  const colors = [...new Set(product.variants.map(v => v.color))]
  const sizes = [...new Set(product.variants.map(v => v.size))]

  // Editor gösteriliyorsa, sadece editor'ü göster
  // Seçili variant'ın görselini kullan
  const currentImage = selectedVariantData?.image || product.images[0] || ''
  
  if (showEditor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-grow">
          <CustomDesignEditor
            productImage={currentImage}
            productName={product.name}
            productColor={selectedVariantData?.color}
            onSave={handleDesignSave}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Ürün Bilgileri */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Ürün Görseli */}
                <div>
                  <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                    {currentImage ? (
                      <img
                        src={currentImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-8xl">👕</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ürün Detayları */}
                <div>
                  <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
                  <p className="text-gray-600 mb-6">{product.description}</p>
                  
                  <div className="text-4xl font-bold text-purple-600 mb-6">
                    {formatPrice(totalPrice)}
                  </div>

                  {/* Renk Seçimi */}
                  <div className="mb-6">
                    <label className="block font-semibold mb-3 text-gray-900">Renk</label>
                    <div className="flex flex-wrap gap-3">
                      {colors.map((color) => {
                        // Seçili size için bu rengin variant'ını bul
                        const selectedSize = selectedVariantData?.size || sizes[0]
                        const variant = product.variants.find(
                          v => v.color === color && v.size === selectedSize
                        )
                        
                        return (
                          <button
                            key={color}
                            onClick={() => {
                              if (variant) {
                                setSelectedVariant(variant.id)
                                console.log('Color changed to:', color, 'Variant:', variant.id, 'Image:', variant.image)
                              }
                            }}
                            className={`px-4 py-2 rounded-lg border-2 transition ${
                              selectedVariantData?.color === color
                                ? 'border-purple-600 bg-purple-50 font-semibold text-gray-900'
                                : 'border-gray-300 hover:border-gray-400 text-gray-900'
                            }`}
                          >
                            {color}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Beden Seçimi */}
                  <div className="mb-6">
                    <label className="block font-semibold mb-3 text-gray-900">Beden</label>
                    <div className="flex flex-wrap gap-3">
                      {sizes.map((size) => {
                        const variant = product.variants.find(
                          v => v.size === size && v.color === selectedVariantData?.color
                        )
                        return (
                          <button
                            key={size}
                            onClick={() => variant && setSelectedVariant(variant.id)}
                            disabled={!variant || variant.stock === 0}
                            className={`px-4 py-2 rounded-lg border-2 transition ${
                              selectedVariantData?.size === size
                                ? 'border-purple-600 bg-purple-50 text-gray-900 font-semibold'
                                : 'border-gray-300 hover:border-gray-400 text-gray-900'
                            } ${(!variant || variant.stock === 0) && 'opacity-50 cursor-not-allowed'}`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasarım Durumu */}
            {design && design.length > 0 ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-green-800 mb-1">
                      ✅ Tasarım Hazır!
                    </h3>
                    <p className="text-green-700">
                      {design.length} element içeren tasarımınız kaydedildi
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEditor(true)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
                  >
                    Düzenle
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 mb-6 text-center">
                <h3 className="font-bold text-2xl mb-4">🎨 Tasarımınızı Oluşturun</h3>
                <p className="text-gray-700 mb-6">
                  Görsel yükleyin, metin ekleyin ve sürükleyerek konumlandırın!
                </p>
                <button
                  onClick={() => setShowEditor(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
                >
                  Tasarım Editörünü Aç
                </button>
              </div>
            )}

            {/* Sepete Ekle */}
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariantData?.stock === 0 || !design}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {selectedVariantData?.stock === 0 
                ? 'Stokta Yok' 
                : !design 
                ? 'Önce Tasarım Oluşturun' 
                : 'Sepete Ekle'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
