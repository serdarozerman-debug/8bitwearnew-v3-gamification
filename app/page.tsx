import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { ArrowRight, Sparkles, Palette, Package, Truck } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
                Hayalinizdeki Tasarımı <br />
                <span className="text-yellow-300">AI ile Gerçeğe</span> Dönüştürün
          </h1>
              <p className="text-xl md:text-2xl mb-8 text-purple-100">
                Kişiye özel 3D baskılı tişört, sweatshirt ve hoodie. 
                Tasarımınızı yükleyin, AI iyileştirsin, biz üretelim!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/products"
                  className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition flex items-center justify-center space-x-2"
                >
                  <span>Hemen Başla</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link 
                  href="/how-it-works"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-purple-600 transition"
                >
                  Nasıl Çalışır?
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Nasıl Çalışır */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4">Süper Kolay!</h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              4 basit adımda kişiye özel giysiniz hazır
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {/* Step 1 */}
              <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:shadow-xl transition">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-2">1</div>
                <h3 className="font-bold text-lg mb-2">Ürün Seç</h3>
                <p className="text-gray-600 text-sm">
                  Tişört, sweatshirt veya hoodie seçin. Renk ve beden belirleyin.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:shadow-xl transition">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-pink-600" />
                </div>
                <div className="text-3xl font-bold text-pink-600 mb-2">2</div>
                <h3 className="font-bold text-lg mb-2">Tasarım Yükle</h3>
                <p className="text-gray-600 text-sm">
                  Logo, baskı veya görseli yükleyin. AI otomatik iyileştirsin.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:shadow-xl transition">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-orange-600 mb-2">3</div>
                <h3 className="font-bold text-lg mb-2">Onayla & Öde</h3>
                <p className="text-gray-600 text-sm">
                  AI tasarımını onaylayın, güvenle ödeme yapın. Üretim başlasın!
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white p-6 rounded-xl shadow-lg text-center hover:shadow-xl transition">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-600 mb-2">4</div>
                <h3 className="font-bold text-lg mb-2">Kapınızda!</h3>
                <p className="text-gray-600 text-sm">
                  Kargo takip ile ürününüzü izleyin. Hızlı teslimat garantisi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Özellikler */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Neden 8BitWear?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="font-bold text-xl mb-2">AI Destekli Tasarım</h3>
                <p className="text-gray-600">
                  Tasarımınızı AI ile profesyonel hale getirin. 3 deneme hakkı!
                </p>
              </div>

              <div className="text-center">
                <div className="text-6xl mb-4">⚡</div>
                <h3 className="font-bold text-xl mb-2">Hızlı Üretim</h3>
                <p className="text-gray-600">
                  Tamamen otonom sistem. Sipariş sonrası otomatik üretim süreci.
                </p>
              </div>

              <div className="text-center">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="font-bold text-xl mb-2">Kaliteli Baskı</h3>
                <p className="text-gray-600">
                  3D baskı teknolojisi ile yüksek kaliteli, dayanıklı ürünler.
          </p>
        </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Şimdi Kendi Tasarımınızı Oluşturun!
            </h2>
            <p className="text-xl mb-8 text-purple-100">
              Benzersiz, size özel giysiler için ilk adımı atın
            </p>
            <Link 
              href="/products"
              className="inline-flex items-center space-x-2 bg-white text-purple-600 px-10 py-5 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
            >
              <span>Ürünleri Keşfet</span>
              <ArrowRight className="w-6 h-6" />
            </Link>
        </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
