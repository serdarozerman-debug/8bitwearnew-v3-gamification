'use client'

import { useState, useRef } from 'react'
import { DndContext, DragEndEvent, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { HexColorPicker } from 'react-colorful'
import { Upload, Type, Image as ImageIcon, Trash2, ZoomIn, ZoomOut, RotateCw, Save } from 'lucide-react'
import { toast, Toaster } from 'sonner'

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

// Draggable Element Component with Resize Handles
function DraggableElement({ 
  id, 
  element, 
  isSelected, 
  onSelect,
  onResize
}: {
  id: string
  element: DesignElement
  isSelected: boolean
  onSelect: () => void
  onResize: (id: string, newWidth: number, newHeight: number) => void
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

  // Resize handler (köşe handle'larından sürüklendiğinde)
  const handleResizeMouseDown = (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation()
    e.preventDefault()
    
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.imageWidth || 200,
      height: element.imageHeight || 200,
    })
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX
      const deltaY = moveEvent.clientY - e.clientY
      
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      
      // Köşeye göre resize direction
      if (corner === 'se') {
        newWidth = resizeStart.width + deltaX
        newHeight = resizeStart.height + deltaY
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
      newWidth = Math.max(50, Math.min(600, newWidth))
      newHeight = Math.max(50, Math.min(600, newHeight))
      
      onResize(id, newWidth, newHeight)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isResizing ? {} : listeners)}  // Resize sırasında drag'i devre dışı bırak
      {...(isResizing ? {} : attributes)}
      className={isSelected ? 'ring-2 ring-purple-500 rounded' : ''}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
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
            }}
            draggable={false}
          />
          
          {/* Resize Handles (sadece seçili ise göster) */}
          {isSelected && (
            <>
              {/* NW - Sol Üst */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize hover:bg-purple-500 transition"
                style={{ zIndex: 10 }}
              />
              
              {/* NE - Sağ Üst */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize hover:bg-purple-500 transition"
                style={{ zIndex: 10, right: '-8px' }}
              />
              
              {/* SW - Sol Alt */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize hover:bg-purple-500 transition"
                style={{ zIndex: 10, bottom: '-8px' }}
              />
              
              {/* SE - Sağ Alt */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize hover:bg-purple-500 transition"
                style={{ zIndex: 10, right: '-8px', bottom: '-8px' }}
              />
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Metin ekleme state'leri
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [textColor, setTextColor] = useState('#000000')
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal')
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal')

  // Drag end handler - KRITIK: Bu olmadan drag çalışmaz
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    
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
            const newElement: DesignElement = {
              id: tempId,
              type: 'image',
              position: { x: 50, y: 50 },
              imageUrl: data.convertedImageUrl,
              imageWidth: 200,
              imageHeight: 200,
              rotation: 0,
            }
            
            setElements(prev => [...prev, newElement])
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
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('Görsel yüklenemedi')
    } finally {
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

  // Element silme
  const handleDeleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
    }
    toast.success('Element silindi')
  }

  // Görsel boyutlandırma (manuel resize handler)
  const handleImageResize = (id: string, scale: number) => {
    setElements(prev => prev.map(el => {
      if (el.id === id && el.type === 'image') {
        return {
          ...el,
          imageWidth: (el.imageWidth || 150) * scale,
          imageHeight: (el.imageHeight || 150) * scale,
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />
      
      {/* Sol Panel - Araçlar */}
      <div className="w-full lg:w-80 space-y-4 shrink-0">
        {/* Görsel Yükleme */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-900">
            <ImageIcon className="w-5 h-5" />
            Görsel Ekle
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploadingImage}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            {uploadingImage ? 'İşleniyor...' : 'Görsel Yükle'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Yüklediğiniz görsel otomatik olarak pixel art'a dönüştürülecek
          </p>
        </div>

        {/* Metin Ekleme */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-900">
            <Type className="w-5 h-5" />
            Metin Ekle
          </h3>
          
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Metninizi yazın..."
            className="w-full px-3 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-900 placeholder:text-gray-500"
          />

          {/* Font Ailesi */}
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-900"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
            <option value="Impact">Impact</option>
            <option value="Brush Script MT">Brush Script</option>
          </select>

          {/* Font Boyutu */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Boyut: {fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="120"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Renk Seçici - DÜZELTİLMİŞ */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2 text-gray-900">Renk</label>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm hover:border-purple-600 transition"
                style={{ backgroundColor: textColor }}
                title="Renk seçici"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono uppercase text-gray-900"
                placeholder="#000000"
              />
            </div>
            {showColorPicker && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <HexColorPicker color={textColor} onChange={setTextColor} />
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="w-full mt-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>

          {/* Font Style */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
              className={`flex-1 py-2 rounded-lg border-2 font-bold transition ${
                fontWeight === 'bold'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-300 hover:border-purple-600'
              }`}
            >
              B
            </button>
            <button
              onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
              className={`flex-1 py-2 rounded-lg border-2 italic transition ${
                fontStyle === 'italic'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-300 hover:border-purple-600'
              }`}
            >
              I
            </button>
          </div>

          <button
            onClick={handleAddText}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
          >
            Metni Ekle
          </button>
        </div>

        {/* Seçili Element Düzenleme */}
        {selectedEl && (
          <div className="bg-white rounded-xl p-4 shadow-md">
            <h3 className="font-bold text-lg mb-3 text-gray-900">Seçili Element</h3>
            
            {selectedEl.type === 'image' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImageResize(selectedEl.id, 1.2)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1"
                  >
                    <ZoomIn className="w-4 h-4" />
                    Büyüt
                  </button>
                  <button
                    onClick={() => handleImageResize(selectedEl.id, 0.8)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1"
                  >
                    <ZoomOut className="w-4 h-4" />
                    Küçült
                  </button>
                </div>
                <button
                  onClick={() => handleImageRotate(selectedEl.id)}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-1"
                >
                  <RotateCw className="w-4 h-4" />
                  Döndür
                </button>
              </div>
            )}

            {selectedEl.type === 'text' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={selectedEl.text}
                  onChange={(e) => handleTextUpdate(selectedEl.id, { text: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">
                    Boyut: {selectedEl.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={selectedEl.fontSize}
                    onChange={(e) => handleTextUpdate(selectedEl.id, { fontSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => handleDeleteElement(selectedEl.id)}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1 mt-3"
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </button>
          </div>
        )}

        {/* Kaydet Butonu */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center justify-center gap-2 font-bold text-lg shadow-lg"
        >
          <Save className="w-6 h-6" />
          Tasarımı Kaydet
        </button>
      </div>

      {/* Merkez - Canvas */}
      <div className="flex-1 bg-white rounded-xl shadow-lg p-8 relative overflow-hidden">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">{productName}</h2>
        
        {/* Canvas Area - DndContext ile onDragEnd eklendi */}
        <DndContext onDragEnd={handleDragEnd}>
          <div 
            className="relative mx-auto bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300"
            style={{ 
              width: '600px', 
              height: '700px',
              backgroundColor: '#f8fafc',
            }}
          >
            {/* Base T-shirt Mockup (her zaman görünür) */}
            <img
              src={mockupImage}
              alt="T-shirt mockup"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
              draggable={false}
            />

            {/* Design Elements */}
            {elements.map(element => {
              return (
                <DraggableElement
                  key={element.id}
                  id={element.id}
                  element={element}
                  isSelected={selectedElement === element.id}
                  onSelect={() => setSelectedElement(element.id)}
                  onResize={handleResizeDrag}
                />
              )
            })}

          </div>
        </DndContext>

        {/* Element Sayısı */}
        <div className="mt-4 text-center text-sm text-gray-600">
          Toplam {elements.length} element
        </div>
      </div>
    </div>
  )
}
