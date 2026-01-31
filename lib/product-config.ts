// Product Configuration Types
export type ProductType = 'tshirt' | 'sweatshirt' | 'hat' | 'bag' | 'keychain'

export type ProductAngle = 
  | 'front-chest' | 'right-sleeve' | 'left-sleeve' | 'back' // T-shirt & Sweatshirt
  | 'front-forehead' | 'right-side' | 'left-side' // Hat
  | 'front-face' | 'side-pocket' // Bag
  | 'flat-white' // Keychain

export type ProductColor = 'white' | 'black' | 'blue' | 'red' | 'navy' | 'pink' | 'yellow' | 'green'

export type ProductSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'child' | 'adult'

export interface ProductConfig {
  id: ProductType
  name: string
  angles: { id: ProductAngle; name: string }[]
  colors: ProductColor[]
  sizes?: ProductSize[]
  mockupBaseUrl: string // e.g., "/mockups/tshirt/{color}/{angle}.png"
}

export const PRODUCT_CONFIGS: Record<ProductType, ProductConfig> = {
  tshirt: {
    id: 'tshirt',
    name: 'Tişört',
    angles: [
      { id: 'front-chest', name: 'Ön Göğüs' },
      { id: 'right-sleeve', name: 'Sağ Kol' },
      { id: 'left-sleeve', name: 'Sol Kol' },
      { id: 'back', name: 'Sırt' },
    ],
    colors: ['white', 'black', 'blue', 'red', 'navy', 'pink', 'yellow', 'green'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    mockupBaseUrl: '/mockups/tshirt',
  },
  sweatshirt: {
    id: 'sweatshirt',
    name: 'Sweatshirt',
    angles: [
      { id: 'front-chest', name: 'Ön Göğüs' },
      { id: 'right-sleeve', name: 'Sağ Kol' },
      { id: 'left-sleeve', name: 'Sol Kol' },
      { id: 'back', name: 'Sırt' },
    ],
    colors: ['white', 'black', 'blue', 'red', 'navy', 'pink', 'yellow', 'green'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    mockupBaseUrl: '/mockups/sweatshirt',
  },
  hat: {
    id: 'hat',
    name: 'Şapka',
    angles: [
      { id: 'front-forehead', name: 'Ön (Alın)' },
      { id: 'right-side', name: 'Sağ Taraf' },
      { id: 'left-side', name: 'Sol Taraf' },
    ],
    colors: ['white', 'black', 'blue', 'red', 'navy', 'pink', 'yellow', 'green'],
    sizes: ['child', 'adult'],
    mockupBaseUrl: '/mockups/hat',
  },
  bag: {
    id: 'bag',
    name: 'Çanta',
    angles: [
      { id: 'front-face', name: 'Ön Yüz' },
      { id: 'side-pocket', name: 'Yan Cep' },
    ],
    colors: ['white', 'black', 'blue', 'red', 'navy', 'pink', 'yellow', 'green'],
    mockupBaseUrl: '/mockups/bag',
  },
  keychain: {
    id: 'keychain',
    name: 'Anahtarlık',
    angles: [
      { id: 'flat-white', name: 'Düz Beyaz Alan' },
    ],
    colors: ['white'],
    mockupBaseUrl: '/mockups/keychain',
  },
}

export const COLOR_LABELS: Record<ProductColor, string> = {
  white: 'Beyaz',
  black: 'Siyah',
  blue: 'Mavi',
  red: 'Kırmızı',
  navy: 'Lacivert',
  pink: 'Pembe',
  yellow: 'Sarı',
  green: 'Yeşil',
}

export const COLOR_HEX: Record<ProductColor, string> = {
  white: '#FFFFFF',
  black: '#000000',
  blue: '#3B82F6',
  red: '#EF4444',
  navy: '#1E3A8A',
  pink: '#EC4899',
  yellow: '#FBBF24',
  green: '#10B981',
}
