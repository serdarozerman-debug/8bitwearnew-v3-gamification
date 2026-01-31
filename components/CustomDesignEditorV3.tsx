'use client'
// Version: 1.3.0 - Native touch events + button resize for mobile

import { useState, useRef, useEffect } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, useDraggable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { HexColorPicker } from 'react-colorful'
import { Upload, Type, Image as ImageIcon, Trash2, ZoomIn, ZoomOut, RotateCw, Save, Share2, ChevronUp, ChevronDown } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import html2canvas from 'html2canvas'
import { 
  PRODUCT_CONFIGS, 
  ProductType, 
  ProductAngle, 
  ProductColor, 
  ProductSize,
  COLOR_LABELS,
  COLOR_HEX
} from '@/lib/product-config'

// Mobile detection utility
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768
}

// Add loading bar animation CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes loading-bar {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(100%); }
    }
  `
  document.head.appendChild(style)
}

interface DesignElement {
  id: string
  type: 'image' | 'text'
  position: { x: number; y: number }
  
  // Image properties
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  rotation?: number
  
  // Text properties
  text?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
}

// Draggable Element Component with Resize Handles + Delete Button
function DraggableElement({ 
  id, 
  element, 
  isSelected, 
  onSelect,
  onResize,
  onDeleteRequest
}: {
  id: string
  element: DesignElement
  isSelected: boolean
  onSelect: () => void
  onResize: (id: string, newWidth: number, newHeight: number) => void
  onDeleteRequest: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
  })
  
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const style = {
    position: 'absolute' as const,
    left: element.position.x,
    top: element.position.y,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    cursor: isResizing ? 'nwse-resize' : 'move',
  }

  // Resize handler (köşe handle'larından sürüklendiğinde - Mouse & Touch)
  const handleResizeStart = (
    e: React.MouseEvent | React.TouchEvent, 
    corner: 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Touch veya Mouse event'ten koordinat al
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    setIsResizing(true)
    setResizeStart({
      x: clientX,
      y: clientY,
      width: element.imageWidth || 45,
      height: element.imageHeight || 45,
    })
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
      
      const deltaX = moveClientX - clientX
      const deltaY = moveClientY - clientY
      
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      
      // Sağ alt köşeden resize - orantılı
      if (corner === 'se') {
        const avgDelta = (deltaX + deltaY) / 2
        newWidth = resizeStart.width + avgDelta
        newHeight = resizeStart.height + avgDelta
      } else if (corner === 'sw') {
        newWidth = resizeStart.width - deltaX
        newHeight = resizeStart.height + deltaY
      } else if (corner === 'ne') {
        newWidth = resizeStart.width + deltaX
        newHeight = resizeStart.height - deltaY
      } else if (corner === 'nw') {
        newWidth = resizeStart.width - deltaX
        newHeight = resizeStart.height - deltaY
      }
      
      // Min/max sınırları
      newWidth = Math.max(30, Math.min(300, newWidth))
      newHeight = Math.max(30, Math.min(300, newHeight))
      
      onResize(id, newWidth, newHeight)
    }
    
    const handleEnd = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMove as any)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove as any)
      document.removeEventListener('touchend', handleEnd)
    }
    
    document.addEventListener('mousemove', handleMove as any)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove as any, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isResizing ? {} : listeners)}  // Resize sırasında drag'i devre dışı bırak
      {...(isResizing ? {} : attributes)}
      className={`relative ${isSelected ? 'ring-4 ring-purple-600 ring-offset-2 rounded-lg shadow-lg' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
        if (e.touches.length === 1 && !isResizing) {
          onSelect()
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(20)
          }
        }
      }}
    >
      {/* DELETE BUTTON - Always visible on hover or when selected */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDeleteRequest(id)
        }}
        className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center z-20 transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
        style={{ 
          opacity: isSelected ? 1 : undefined 
        }}
        title="Sil"
      >
        🗑️
      </button>

      {element.type === 'image' && element.imageUrl && (
        <>
          <img
            src={element.imageUrl}
            alt="Design"
            style={{
              width: element.imageWidth,
              height: element.imageHeight,
              objectFit: 'contain',
              transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
              pointerEvents: 'none',
              WebkitTouchCallout: 'none', // iOS context menu'yi engelle
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()} // Long-press menu'yi engelle
          />
          
          {/* Resize Handles */}
          {/* Desktop: Sadece seçili ise göster, Mobile: HER ZAMAN göster */}
          {(isSelected || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
            <>
              {/* Desktop: 4 köşe handle - Mobilde gizli */}
              <div className="hidden md:block">
                {isSelected && (
                  <>
                    {/* NW - Sol Üst */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'nw')}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize hover:bg-purple-500 transition"
                      style={{ zIndex: 10 }}
                    />
                    
                    {/* NE - Sağ Üst */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'ne')}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize hover:bg-purple-500 transition"
                      style={{ zIndex: 10, right: '-8px' }}
                    />
                    
                    {/* SW - Sol Alt */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, 'sw')}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize hover:bg-purple-500 transition"
                      style={{ zIndex: 10, bottom: '-8px' }}
                    />
                  </>
                )}
              </div>
              
              {/* SE - Sağ Alt (HEM DESKTOP HEM MOBİL) */}
              {/* MOBİLDE: Her zaman görünür, DESKTOP: Sadece seçili ise */}
              <div
                onMouseDown={(e) => handleResizeStart(e, 'se')}
                onTouchStart={(e) => handleResizeStart(e, 'se')}
                className="absolute -bottom-2 -right-2 w-10 h-10 md:w-4 md:h-4 bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white rounded-full shadow-lg cursor-nwse-resize hover:scale-110 transition-all active:scale-125"
                style={{ 
                  zIndex: 50, 
                  right: '-16px', 
                  bottom: '-16px',
                  touchAction: 'none', // iOS'ta smooth touch
                }}
              >
                {/* Mobilde resize ikonu */}
                <div className="md:hidden absolute inset-0 flex items-center justify-center text-white text-base font-bold pointer-events-none">
                  ⤢
                </div>
              </div>
            </>
          )}
        </>
      )}

      {element.type === 'text' && (
        <div
          style={{
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            color: element.color,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {element.text}
        </div>
      )}
    </div>
  )
}

interface CustomDesignEditorProps {
  productImage: string
  productName: string
  productColor?: string
  onSave: (design: DesignElement[]) => void
}

export default function CustomDesignEditor({ 
  productImage, 
  productName,
  productColor = 'white',
  onSave 
}: CustomDesignEditorProps) {
  const [elements, setElements] = useState<DesignElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDraggingElement, setIsDraggingElement] = useState(false) // Scroll lock için
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fun loading messages for kids
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const loadingMessages = [
    "✨ Şimdi sihir zamanı...",
    "🎨 Tişörtünü hazırlıyoruz...",
    "🎉 İlk tişörtünle +50 XP kazandın!",
    "💝 Tişörtünü arkadaşlarınla paylaş!",
    "👍 Arkadaşların beğensin!",
    "⭐ Daha çok puan kazan!",
    "🚀 Neredeyse hazır...",
    "🎮 Harika gidiyorsun!",
  ]
  
  // Rotate loading messages
  useEffect(() => {
    if (uploadingImage) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length)
      }, 2000) // Change message every 2 seconds
      
      return () => clearInterval(interval)
    }
  }, [uploadingImage, loadingMessages.length])
  
  // Refs for auto-scroll on step unlock
  const angleStepRef = useRef<HTMLDivElement>(null)
  const colorStepRef = useRef<HTMLDivElement>(null)
  const toolsStepRef = useRef<HTMLDivElement>(null)
  
  // Metin ekleme state'leri
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [textColor, setTextColor] = useState('#000000')
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal')
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal')

  // DnD Kit sensors with touch support - Samsung uyumlu ayarlar
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px hareket etmeden drag başlamasın
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 50, // Samsung için daha kısa delay (100ms → 50ms)
        tolerance: 8, // Daha toleranslı (5px → 8px)
      },
    })
  )

  // Drag start handler - scroll lock için
  const handleDragStart = (event: DragStartEvent) => {
    setIsDraggingElement(true)
    // Body scroll'u engelle (mobilde)
    if (typeof window !== 'undefined') {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    }
  }

  // Drag end handler - KRITIK: Bu olmadan drag çalışmaz
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    
    setIsDraggingElement(false)
    // Body scroll'u tekrar aktif et
    if (typeof window !== 'undefined') {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    
    setElements(prev => prev.map(el => {
      if (el.id === active.id) {
        return {
          ...el,
          position: {
            x: el.position.x + delta.x,
            y: el.position.y + delta.y,
          },
        }
      }
      return el
    }))
  }

  // 🆕 MOBİL RESİZE HANDLER
  const handleMobileResize = (direction: 'bigger' | 'smaller') => {
    if (!selectedElement) return
    
    setElements(prevElements => 
      prevElements.map(el => {
        if (el.id !== selectedElement) return el
        
        const delta = direction === 'bigger' ? 15 : -15
        const newWidth = Math.max(30, Math.min(300, (el.imageWidth || 45) + delta))
        const newHeight = Math.max(30, Math.min(300, (el.imageHeight || 45) + delta))
        
        return {
          ...el,
          imageWidth: newWidth,
          imageHeight: newHeight,
        }
      })
    )
    
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    toast.success(direction === 'bigger' ? '🔼 Büyütüldü!' : '🔽 Küçültüldü!', { 
      duration: 1000,
      position: 'bottom-center'
    })
  }

  // Save & Share design
  const handleSaveDesign = async () => {
    if (!canvasRef.current) {
      toast.error('Canvas bulunamadı!')
      return
    }

    if (elements.length === 0) {
      toast.error('Önce bir tasarım oluştur!')
      return
    }

    setIsSaving(true)
    const loadingToast = toast.loading('✨ Tasarımın kaydediliyor...')

    try {
      // 1. Canvas'ı PNG'ye çevir (html2canvas)
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#f9fafb',
        scale: 2, // Yüksek kalite
        logging: false,
        useCORS: true,
      })

      const previewImageBase64 = canvas.toDataURL('image/png')

      // 2. API'ye kaydet
      const response = await fetch('/api/designs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: selectedProductType,
          productColor: selectedColor,
          productAngle: selectedAngle,
          mockupImage: mockupImage,
          previewImageBase64,
          designElements: elements,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Kaydetme başarısız')
      }

      // 3. Success! URL'i sakla
      setShareUrl(data.shareUrl)
      
      toast.dismiss(loadingToast)
      toast.success(
        <div className="flex flex-col gap-2">
          <div className="font-bold">🎉 Tasarımın kaydedildi!</div>
          <div className="text-sm">Paylaşım linkine tıkla → otomatik kopyalanır</div>
        </div>,
        { duration: 5000 }
      )

    } catch (error: any) {
      console.error('Save design error:', error)
      toast.dismiss(loadingToast)
      toast.error(error.message || 'Kaydetme sırasında hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  // Copy share URL to clipboard
  const handleCopyShareUrl = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('📋 Link kopyalandı!', { duration: 2000 })
    } catch (error) {
      console.error('Copy error:', error)
      toast.error('Link kopyalanamadı')
    }
  }


  // Görsel yükleme ve OpenAI conversion
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı')
      return
    }

    setUploadingImage(true)

    try {
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string
        const tempId = `img-${Date.now()}`
        
        // 📸 Adım 1: Yükleme başlatıldı
        toast.loading('📸 Görsel yükleniyor...', { id: 'ai-conversion' })
        
        // OpenAI'a gönder ve pixel art'a çevir
        try {
          console.log('[Upload] Sending to OpenAI, image size:', imageUrl.length, 'bytes')
          
          // 🤖 Adım 2: AI analizi
          toast.loading('🤖 AI görsel analizi yapılıyor...', { id: 'ai-conversion' })
          
          const response = await fetch('/api/ai/convert-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl,
              prompt: 'Use uploaded photo as reference. Keep silhouette and pose. Single character. 64x64 pixel-art sprite, flat solid colors only, one color per area, black outlines, max 16 colors, hair one rounded blob, transparent background, no shading/highlights/gradients/texture.',
            }),
          })

          // 🎨 Adım 3: Pixel art oluşturuluyor
          toast.loading('🎨 Pixel art oluşturuluyor...', { id: 'ai-conversion' })

          console.log('[Upload] Response status:', response.status)
          const data = await response.json()
          console.log('[Upload] Response data:', data)
          
          if (data.success && data.convertedImageUrl) {
            // ✅ Başarılı - AI görseli ile element oluştur
            // MOBİLDE otomatik olarak 80px (görünür boyut), desktop'ta 45px
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
            const initialSize = isMobile ? 80 : 45
            
            const newElement: DesignElement = {
              id: tempId,
              type: 'image',
              position: { x: 50, y: 50 },
              imageUrl: data.convertedImageUrl,
              imageWidth: initialSize,
              imageHeight: initialSize,
              rotation: 0,
            }
            
            setElements(prev => {
              const newElements = [...prev, newElement]
              
              // İlk pixel art mı? (Sadece image type'ları say)
              const imageCount = newElements.filter(el => el.type === 'image').length
              if (imageCount === 1 && !firstPixelArtAdded) {
                setFirstPixelArtAdded(true)
                // Kısa bir gecikme sonra congratulations mesajı
                setTimeout(() => {
                  toast.success('🎉 Harikaaa! İlk tasarımın geldi! İstersen başka tasarımlar da ekleyebilirsin! 🚀', {
                    duration: 6000, // 6 saniye göster
                    style: {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      padding: '16px',
                    },
                  })
                }, 500)
              }
              
              return newElements
            })
            setSelectedElement(tempId)
            toast.success(`✨ Pixel art dönüşümü tamamlandı! (${data.method || 'unknown'})`, { id: 'ai-conversion' })
          } else {
            // ❌ Başarısız - görsel ekleme yok
            console.warn('[Upload] AI conversion failed:', data.error)
            toast.error(`❌ AI dönüşümü başarısız: ${data.error || 'Bilinmeyen hata'}`, { id: 'ai-conversion' })
          }
        } catch (error: any) {
          console.error('[Upload] AI conversion error:', error)
          toast.error('❌ AI dönüşümü sırasında hata oluştu', { id: 'ai-conversion' })
        } finally {
          // Loading'i kapat (inner try-catch'te)
          setUploadingImage(false)
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('Görsel yüklenemedi')
      setUploadingImage(false)
    }
  }

  // Metin ekleme
  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error('Lütfen bir metin girin')
      return
    }

    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      position: { x: 100, y: 100 },
      text: textInput,
      fontSize,
      fontFamily,
      color: textColor,
      fontWeight,
      fontStyle,
    }

    setElements(prev => [...prev, newElement])
    setSelectedElement(newElement.id)
    setTextInput('')
    toast.success('Metin eklendi')
  }

  // Element silme - confirmation ile
  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmModal(id)
  }

  const confirmDelete = () => {
    if (deleteConfirmModal) {
      setElements(prev => prev.filter(el => el.id !== deleteConfirmModal))
      if (selectedElement === deleteConfirmModal) {
        setSelectedElement(null)
      }
      toast.success('Element silindi')
      setDeleteConfirmModal(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmModal(null)
  }

  // Görsel boyutlandırma (manuel resize handler)
  const handleImageResize = (id: string, scale: number) => {
    setElements(prev => prev.map(el => {
      if (el.id === id && el.type === 'image') {
        return {
          ...el,
          imageWidth: (el.imageWidth || 45) * scale,  // V2 ile aynı default
          imageHeight: (el.imageHeight || 45) * scale, // V2 ile aynı default
        }
      }
      return el
    }))
  }
  
  // Görsel boyutlandırma (drag handle'dan)
  const handleResizeDrag = (id: string, newWidth: number, newHeight: number) => {
    setElements(prev => prev.map(el => {
      if (el.id === id && el.type === 'image') {
        return {
          ...el,
          imageWidth: newWidth,
          imageHeight: newHeight,
        }
      }
      return el
    }))
  }

  // Görsel döndürme
  const handleImageRotate = (id: string) => {
    setElements(prev => prev.map(el => {
      if (el.id === id && el.type === 'image') {
        return {
          ...el,
          rotation: ((el.rotation || 0) + 90) % 360,
        }
      }
      return el
    }))
  }

  // Metin güncelleme
  const handleTextUpdate = (id: string, updates: Partial<DesignElement>) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }

  // Kaydet
  const handleSave = () => {
    if (elements.length === 0) {
      toast.error('Lütfen en az bir tasarım elementi ekleyin')
      return
    }
    
    onSave(elements)
    toast.success('Tasarım kaydedildi!')
  }

  const selectedEl = elements.find(el => el.id === selectedElement)
  const mockupImage = productImage || 'https://placehold.co/600x700/cccccc/222222?text=T-Shirt+Mockup'

  // Product configuration
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null)
  const [selectedAngle, setSelectedAngle] = useState<ProductAngle | null>(null)
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null)
  
  // Tutorial/Stepper mode
  const [currentStep, setCurrentStep] = useState<'product' | 'angle' | 'color' | 'tools'>('product')
  
  // Delete confirmation modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<string | null>(null)
  
  // First pixel art added flag
  const [firstPixelArtAdded, setFirstPixelArtAdded] = useState(false)
  
  // Save & Share states
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  
  const currentProduct = selectedProductType ? PRODUCT_CONFIGS[selectedProductType] : null
  const availableAngles = currentProduct?.angles || []
  const availableColors = currentProduct?.colors || []

  // Handle product type selection
  const handleProductSelect = (type: ProductType) => {
    setSelectedProductType(type)
    setSelectedAngle(null)
    setSelectedColor(null)
    setCurrentStep('angle')
    
    // Auto-scroll to angle step after short delay
    setTimeout(() => {
      angleStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  // Handle angle selection
  const handleAngleSelect = (angle: ProductAngle) => {
    setSelectedAngle(angle)
    setCurrentStep('color')
    
    // Auto-scroll to color step after short delay
    setTimeout(() => {
      colorStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  // Handle color selection
  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color)
    setCurrentStep('tools')
    
    // Auto-scroll to tools step after short delay
    setTimeout(() => {
      toolsStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  // Check if step is unlocked
  const isStepUnlocked = (step: 'product' | 'angle' | 'color' | 'tools') => {
    if (step === 'product') return true
    if (step === 'angle') return selectedProductType !== null
    if (step === 'color') return selectedAngle !== null
    if (step === 'tools') return selectedColor !== null
    return false
  }

  // Angle icons (kid-friendly emojis)
  const ANGLE_EMOJIS: Record<string, string> = {
    'front-chest': '👀', // Front view
    'back': '🔙', // Back
    'right-sleeve': '👉', // Right
    'left-sleeve': '👈', // Left
    'front-forehead': '🎩', // Hat front
    'right-side': '➡️', // Hat right
    'left-side': '⬅️', // Hat left
    'front-face': '😊', // Bag front
    'side-pocket': '🎒', // Bag pocket
    'flat-white': '⚪', // Keychain
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 relative overflow-hidden">
      <Toaster position="top-center" richColors />
      
      {/* LOADING OVERLAY - Fun Messages for Kids */}
      {uploadingImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="relative">
            {/* Flying Stars Animation */}
            <div className="absolute -top-20 -left-20 text-6xl animate-bounce" style={{ animationDuration: '1s' }}>⭐</div>
            <div className="absolute -top-10 -right-20 text-5xl animate-bounce" style={{ animationDuration: '1.3s', animationDelay: '0.2s' }}>✨</div>
            <div className="absolute -bottom-10 -left-16 text-4xl animate-bounce" style={{ animationDuration: '1.5s', animationDelay: '0.4s' }}>🌟</div>
            <div className="absolute -bottom-16 -right-10 text-5xl animate-bounce" style={{ animationDuration: '1.2s', animationDelay: '0.6s' }}>💫</div>
            <div className="absolute top-0 left-1/2 text-4xl animate-bounce" style={{ animationDuration: '1.4s', animationDelay: '0.3s' }}>🎨</div>
            <div className="absolute bottom-0 left-1/2 text-5xl animate-bounce" style={{ animationDuration: '1.6s', animationDelay: '0.5s' }}>🎮</div>
            
            {/* Main Loading Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-10 shadow-2xl min-w-[400px] text-center">
              {/* Rotating Loading Spinner */}
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-8 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-8 border-transparent border-t-pink-600 rounded-full animate-spin" style={{ animationDuration: '0.6s', animationDirection: 'reverse' }}></div>
              </div>
              
              {/* Animated Message */}
              <div className="relative h-24 overflow-hidden mb-4">
                <div 
                  className="absolute inset-0 flex items-center justify-center transition-all duration-500"
                  style={{
                    transform: `translateY(${loadingMessageIndex * -100}%)`,
                  }}
                >
                  {loadingMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className="min-h-[96px] flex items-center justify-center px-4"
                      style={{ 
                        opacity: idx === loadingMessageIndex ? 1 : 0,
                        transition: 'opacity 0.5s',
                        position: 'absolute',
                        top: `${idx * 100}%`,
                      }}
                    >
                      <h3 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {msg}
                      </h3>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Loading Bar */}
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 animate-pulse bg-[length:200%_100%]" style={{
                  animation: 'loading-bar 2s ease-in-out infinite'
                }}></div>
              </div>
              
              <p className="mt-4 text-sm text-gray-600 font-semibold">
                🎯 Sabırlı ol, harika bir şey oluyor!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={cancelDelete}>
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md mx-4 animate-bounce" style={{ animationIterationCount: 1, animationDuration: '0.3s' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🗑️</div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">
                Silmek İstediğine Emin Misin?
              </h3>
              <p className="text-gray-600">
                Bu işlem geri alınamaz!
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
              >
                ❌ HAYIR
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
              >
                ✅ EVET, SİL
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MORE Floating Particles - 15 items scattered */}
      <div className="fixed left-[5%] top-[15%] text-5xl opacity-20 pointer-events-none animate-bounce" style={{ animationDuration: '3s', animationDelay: '0s' }}>⭐</div>
      <div className="fixed right-[8%] top-[25%] text-4xl opacity-25 pointer-events-none animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>🎨</div>
      <div className="fixed left-[12%] bottom-[18%] text-5xl opacity-20 pointer-events-none animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }}>✨</div>
      <div className="fixed right-[15%] bottom-[30%] text-3xl opacity-30 pointer-events-none animate-bounce" style={{ animationDuration: '6s', animationDelay: '1.5s' }}>🍪</div>
      <div className="fixed left-[25%] top-[40%] text-4xl opacity-25 pointer-events-none animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }}>🎮</div>
      <div className="fixed right-[20%] top-[50%] text-3xl opacity-30 pointer-events-none animate-bounce" style={{ animationDuration: '5.5s', animationDelay: '2.5s' }}>🚀</div>
      <div className="fixed left-[8%] top-[60%] text-4xl opacity-25 pointer-events-none animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>💎</div>
      <div className="fixed right-[5%] bottom-[15%] text-5xl opacity-20 pointer-events-none animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0s' }}>🎯</div>
      <div className="fixed left-[30%] bottom-[25%] text-3xl opacity-30 pointer-events-none animate-bounce" style={{ animationDuration: '6s', animationDelay: '3s' }}>🏆</div>
      <div className="fixed right-[30%] top-[20%] text-4xl opacity-25 pointer-events-none animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }}>👾</div>
      <div className="fixed left-[18%] top-[35%] text-3xl opacity-30 pointer-events-none animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }}>🔥</div>
      <div className="fixed right-[25%] bottom-[40%] text-4xl opacity-25 pointer-events-none animate-bounce" style={{ animationDuration: '5.5s', animationDelay: '0.5s' }}>💫</div>
      <div className="fixed left-[35%] top-[10%] text-3xl opacity-30 pointer-events-none animate-bounce" style={{ animationDuration: '4s', animationDelay: '2.5s' }}>🌟</div>
      <div className="fixed right-[12%] top-[70%] text-4xl opacity-25 pointer-events-none animate-bounce" style={{ animationDuration: '6s', animationDelay: '1s' }}>🎪</div>
      <div className="fixed left-[22%] bottom-[10%] text-5xl opacity-20 pointer-events-none animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '3s' }}>🎁</div>
      
      {/* Top Banner - Level & Quest */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white p-4 shadow-2xl">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-lg font-black">Görev: İlk Pixel Art Tasarımım</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold">⭐ Level 5</span>
                <div className="bg-white/30 rounded-full h-3 w-48 overflow-hidden">
                  <div className="bg-yellow-400 h-full" style={{width: '56%'}}></div>
                </div>
                <span className="text-xs">450/800 XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Grid - REDUCED GAP */}
      <div className="max-w-[1400px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-4">
        
        {/* LEFT PANEL - Product Selection with Tutorial/Stepper Mode */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
          
          {/* STEP 1: Product Type */}
          <div className={`mb-6 transition-all ${!isStepUnlocked('product') ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                currentStep === 'product' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse' : 
                selectedProductType ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {selectedProductType ? '✓' : '1'}
              </span>
              <h3 className="text-lg font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎮 ÜRÜN TİPİ SEÇ
              </h3>
            </div>
            
            {/* Product Types - SMALLER BUTTONS, BIGGER ICONS */}
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRODUCT_CONFIGS) as ProductType[]).map((type) => (
                <button 
                  key={type}
                  onClick={() => handleProductSelect(type)}
                  className={`aspect-square rounded-2xl p-2 font-bold shadow-lg hover:scale-105 transition-all ${
                    selectedProductType === type 
                      ? 'ring-4 ring-purple-500 bg-gradient-to-br from-purple-500 to-purple-600 text-white' 
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
                  }`}
                >
                  <div className="text-5xl mb-1">
                    {type === 'tshirt' && '👕'}
                    {type === 'sweatshirt' && '🧥'}
                    {type === 'hat' && '🧢'}
                    {type === 'bag' && '🎒'}
                    {type === 'keychain' && '🔑'}
                  </div>
                  <div className="text-[10px] leading-tight">{PRODUCT_CONFIGS[type].name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Angle */}
          <div ref={angleStepRef} className={`mb-6 transition-all ${!isStepUnlocked('angle') ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                currentStep === 'angle' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse' : 
                selectedAngle ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {selectedAngle ? '✓' : '2'}
              </span>
              <h4 className="text-lg font-black text-gray-700">📐 AÇI SEÇ</h4>
            </div>
            
            {/* Angles with KID-FRIENDLY EMOJIS */}
            <div className="flex flex-wrap gap-2">
              {availableAngles.map((angle) => (
                <button
                  key={angle.id}
                  onClick={() => handleAngleSelect(angle.id)}
                  disabled={!isStepUnlocked('angle')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    selectedAngle === angle.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span className="text-base">{ANGLE_EMOJIS[angle.id] || '📍'}</span>
                  <span>{angle.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3: Color */}
          <div ref={colorStepRef} className={`mb-6 transition-all ${!isStepUnlocked('color') ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                currentStep === 'color' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse' : 
                selectedColor ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {selectedColor ? '✓' : '3'}
              </span>
              <h4 className="text-lg font-black text-gray-700">🎨 RENK SEÇ</h4>
            </div>
            
            {/* Colors - CIRCULAR */}
            <div className="flex flex-wrap gap-2">
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  disabled={!isStepUnlocked('color')}
                  title={COLOR_LABELS[color]}
                  className={`w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-all ${
                    selectedColor === color ? 'ring-4 ring-purple-600' : 'ring-2 ring-gray-300'
                  }`}
                  style={{ backgroundColor: COLOR_HEX[color] }}
                />
              ))}
            </div>
          </div>

          {/* STEP 4: Tools - UNLOCKED after all steps */}
          <div ref={toolsStepRef} className={`transition-all ${!isStepUnlocked('tools') ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                isStepUnlocked('tools') ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-pulse' : 'bg-gray-300 text-gray-600'
              }`}>
                4
              </span>
              <h4 className="text-lg font-black text-gray-700">✨ TASARLA</h4>
            </div>

            {!isStepUnlocked('tools') && (
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-3 mb-4 text-center">
                <p className="text-sm font-bold text-yellow-800">
                  🎯 Önce yukarıdaki adımları tamamla!
                </p>
              </div>
            )}

            {/* V2 Tools - DARKER COLORS */}
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-purple-200 to-pink-200 rounded-2xl p-4 shadow-md">
                <h4 className="font-bold text-base mb-2 flex items-center gap-2 text-purple-900">
                  <ImageIcon className="w-5 h-5" />
                  Görsel Ekle
                </h4>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage || !isStepUnlocked('tools')}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || !isStepUnlocked('tools')}
                  className="w-full bg-gradient-to-r from-purple-700 to-pink-700 text-white py-2.5 rounded-xl hover:shadow-lg transition font-bold text-sm disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  {uploadingImage ? 'İşleniyor...' : 'Görsel Yükle'}
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-200 to-pink-200 rounded-2xl p-4 shadow-md">
                <h4 className="font-bold text-base mb-2 flex items-center gap-2 text-purple-900">
                  <Type className="w-5 h-5" />
                  Metin Ekle
                </h4>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Metninizi yazın..."
                  disabled={!isStepUnlocked('tools')}
                  className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg mb-2 focus:border-purple-600 focus:outline-none text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={handleAddText}
                  disabled={!isStepUnlocked('tools')}
                  className="w-full bg-gradient-to-r from-purple-700 to-pink-700 text-white py-2 rounded-xl hover:shadow-lg transition font-bold text-sm disabled:opacity-50"
                >
                  Metin Ekle
                </button>
              </div>

              {/* SAVE & SHARE DESIGN */}
              {elements.length > 0 && (
                <div className="bg-gradient-to-br from-green-200 to-emerald-300 rounded-2xl p-4 shadow-md animate-bounce-slow">
                  <h4 className="font-bold text-base mb-2 flex items-center gap-2 text-green-900">
                    <Save className="w-5 h-5" />
                    Tasarımı Kaydet & Paylaş
                  </h4>
                  <button
                    onClick={handleSaveDesign}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl hover:shadow-lg transition font-black text-sm disabled:opacity-50 mb-2"
                  >
                    {isSaving ? '💾 Kaydediliyor...' : '💾 Her Tasarımı Kaydet'}
                  </button>
                  
                  {shareUrl && (
                    <div className="space-y-2">
                      {/* Paylaşım Linki - Tıklanabilir */}
                      <div 
                        onClick={handleCopyShareUrl}
                        className="bg-white/50 backdrop-blur-sm rounded-xl p-3 cursor-pointer hover:bg-white/70 transition border-2 border-blue-300"
                      >
                        <p className="text-xs font-bold text-blue-900 mb-1">✨ Paylaşım Linki:</p>
                        <p className="text-xs text-blue-700 font-mono break-all leading-tight">
                          {shareUrl}
                        </p>
                        <p className="text-[10px] text-blue-600 mt-1 font-bold">
                          👆 Tıkla → Otomatik Kopyalanır!
                        </p>
                      </div>
                      
                      {/* Paylaş Butonu */}
                      <button
                        onClick={handleCopyShareUrl}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-xl hover:shadow-lg transition font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        📋 Linki Kopyala
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER PANEL - Mockup (V2 CANVAS CONSTRAINTS) */}
        <div className="bg-gradient-to-br from-pink-300 via-pink-200 to-purple-200 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-center text-2xl font-black mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ✨ TASARIM ALANI ✨
          </h3>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
            <DndContext 
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div 
                ref={canvasRef}
                className="relative mx-auto bg-gray-50 rounded-xl overflow-hidden shadow-inner"
                style={{ 
                  width: '500px', 
                  height: '600px',
                  maxWidth: '100%',
                  maxHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? '500px' : '600px', // Mobilde 500px fixed
                  touchAction: isDraggingElement ? 'none' : 'auto', // Mobilde scroll lock
                }}
                onClick={(e) => {
                  // Boş alana tıklanırsa seçimi kaldır
                  if (e.target === e.currentTarget) {
                    setSelectedElement(null)
                  }
                }}
              >
                <img
                  src={mockupImage}
                  alt="Product mockup"
                  className="absolute inset-0 w-full h-full object-contain select-none"
                  style={{
                    pointerEvents: 'none', // Tüm pointer eventleri engelle
                    WebkitTouchCallout: 'none', // iOS long-press menu
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={() => setSelectedElement(null)}
                />

                {/* V2 CONSTRAINTS: Elements stay within canvas */}
                {elements.map(element => (
                  <DraggableElement
                    key={element.id}
                    id={element.id}
                    element={element}
                    isSelected={selectedElement === element.id}
                    onSelect={() => setSelectedElement(element.id)}
                    onResize={handleResizeDrag}
                    onDeleteRequest={handleDeleteRequest}
                  />
                ))}
              </div>
            </DndContext>
            
            {/* 🆕 MOBİL RESİZE BUTONLARI - Fixed Bottom */}
            {selectedElement && (
              <div className="md:hidden fixed bottom-20 left-0 right-0 z-50 flex gap-2 px-4">
                <button
                  onClick={() => handleMobileResize('smaller')}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition"
                >
                  🔽 KÜÇÜLT
                </button>
                <button
                  onClick={() => handleMobileResize('bigger')}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition"
                >
                  🔼 BÜYÜT
                </button>
              </div>
            )}
            
            <div className="mt-3 text-center text-sm text-gray-600 font-medium">
              {!isStepUnlocked('tools') ? (
                <span className="text-yellow-700 font-bold">
                  🎯 Adım {currentStep === 'product' ? '1' : currentStep === 'angle' ? '2' : '3'} - {
                    currentStep === 'product' ? 'Ürün Tipi Seç' : 
                    currentStep === 'angle' ? 'Açı Seç' : 
                    'Renk Seç'
                  }
                </span>
              ) : (
                <>
                  {elements.length} element • {selectedProductType?.toUpperCase()} • {selectedColor ? COLOR_LABELS[selectedColor] : ''}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Quests */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-2xl">
          <h3 className="text-xl font-black mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🏆 GÖREVLER
          </h3>
          
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-bold text-sm">İlk Görselini Yükle</div>
                  <div className="text-xs opacity-90">+10 XP 💰</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <div className="font-bold text-sm">Tasarımını Tamamla</div>
                  <div className="text-xs opacity-90">+25 XP 🔥</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-300 text-gray-600 shadow-lg opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <div>
                  <div className="font-bold text-sm">İlk Alışverişini Yap</div>
                  <div className="text-xs">+100 XP 🏅</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-300 text-gray-600 shadow-lg opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-sm">5 Ürün Tasarla</div>
                  <div className="text-xs">+200 XP 🌟</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-300 text-gray-600 shadow-lg opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💎</span>
                <div>
                  <div className="font-bold text-sm">Premium Üye Ol</div>
                  <div className="text-xs">+500 XP 👑</div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full mt-5 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-2xl hover:shadow-2xl transition-all font-black text-base flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Tasarımı Kaydet
          </button>
        </div>

      </div>
    </div>
  )
}
