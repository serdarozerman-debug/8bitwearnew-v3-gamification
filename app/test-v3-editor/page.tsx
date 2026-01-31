'use client'

import { useState } from 'react'
import CustomDesignEditorV3 from '@/components/CustomDesignEditorV3'

export default function TestV3EditorPage() {
  const [selectedColor, setSelectedColor] = useState('white')
  const [selectedAngle, setSelectedAngle] = useState('front')

  // Mock product data
  const mockProduct = {
    id: 'test-product',
    name: 'Premium Tişört',
    slug: 'premium-tisort',
    description: 'Test ürünü',
    basePrice: 299,
    category: 'tshirt',
    colors: ['white', 'black', 'red', 'blue', 'pink', 'green', 'navy', 'yellow'],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    mockupImages: {
      white: {
        front: '/mockups/tshirt/white/front-chest.png',
        back: '/mockups/tshirt/white/back.png',
        leftSleeve: '/mockups/tshirt/white/left-sleeve.png',
        rightSleeve: '/mockups/tshirt/white/right-sleeve.png',
      },
      black: {
        front: '/mockups/tshirt/black/front-chest.png',
        back: '/mockups/tshirt/black/back.png',
        leftSleeve: '/mockups/tshirt/black/left-sleeve.png',
        rightSleeve: '/mockups/tshirt/black/right-sleeve.png',
      },
      red: {
        front: '/mockups/tshirt/red/front-chest.png',
        back: '/mockups/tshirt/red/back.png',
        leftSleeve: '/mockups/tshirt/red/left-sleeve.png',
        rightSleeve: '/mockups/tshirt/red/right-sleeve.png',
      },
      blue: {
        front: '/mockups/tshirt/blue/front-chest.png',
        back: '/mockups/tshirt/blue/back.png',
        leftSleeve: '/mockups/tshirt/blue/left-sleeve.png',
        rightSleeve: '/mockups/tshirt/blue/right-sleeve.png',
      },
    },
    features: [],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Get current mockup image based on color and angle
  const getMockupImage = () => {
    const colorMockups = (mockProduct.mockupImages as any)?.[selectedColor]
    if (!colorMockups) return '/mockups/tshirt/white/front.png'
    
    const angleMap: Record<string, string> = {
      'front': colorMockups.front,
      'back': colorMockups.back,
      'leftSleeve': colorMockups.leftSleeve,
      'rightSleeve': colorMockups.rightSleeve,
    }
    
    return angleMap[selectedAngle] || colorMockups.front
  }

  return (
    <div>
      <CustomDesignEditorV3
        product={mockProduct}
        productImage={getMockupImage()}
        productName={mockProduct.name}
        productColor={selectedColor}
        onSave={(elements) => {
          console.log('Design saved:', elements)
          alert('Tasarım kaydedildi! (Test mode)')
        }}
      />
    </div>
  )
}
