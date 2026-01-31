import { Resend } from 'resend'

// Resend is optional - only initialize if key is provided
const resendKey = process.env.RESEND_API_KEY || ''
const resend = resendKey ? new Resend(resendKey) : null

export interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerEmail: string
  items: Array<{
    productName: string
    variant: string
    quantity: number
    customization: any
    designUrl: string
  }>
  shippingAddress: {
    fullName: string
    phone: string
    addressLine1: string
    addressLine2?: string
    city: string
    district: string
    postalCode: string
  }
  totalAmount: string
}

export async function sendSupplierEmail(data: OrderEmailData) {
  if (!resend) {
    console.warn('Resend not configured, skipping supplier email')
    return { success: false, error: 'Email service not configured' }
  }
  
  const itemsHtml = data.items.map((item, index) => `
    <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #333;">Ürün ${index + 1}</h3>
      <p><strong>Ürün:</strong> ${item.productName}</p>
      <p><strong>Varyant:</strong> ${item.variant}</p>
      <p><strong>Adet:</strong> ${item.quantity}</p>
      <p><strong>Kişiselleştirme Detayları:</strong></p>
      <pre style="background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(item.customization, null, 2)}
      </pre>
      <p><strong>Onaylanmış Tasarım:</strong></p>
      <img src="${item.designUrl}" alt="Tasarım" style="max-width: 400px; border-radius: 8px; border: 1px solid #ddd;" />
    </div>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Yeni Sipariş - ${data.orderNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">🎨 Yeni Üretim Siparişi</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Sipariş No: ${data.orderNumber}</p>
      </div>

      <div style="background: #fff; border: 2px solid #667eea; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
        <h2 style="color: #667eea; margin-top: 0;">📦 Sipariş Detayları</h2>
        ${itemsHtml}
      </div>

      <div style="background: #fff; border: 2px solid #764ba2; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
        <h2 style="color: #764ba2; margin-top: 0;">📍 Teslimat Adresi</h2>
        <p><strong>Ad Soyad:</strong> ${data.shippingAddress.fullName}</p>
        <p><strong>Telefon:</strong> ${data.shippingAddress.phone}</p>
        <p><strong>Adres:</strong> ${data.shippingAddress.addressLine1}</p>
        ${data.shippingAddress.addressLine2 ? `<p>${data.shippingAddress.addressLine2}</p>` : ''}
        <p>${data.shippingAddress.district} / ${data.shippingAddress.city}</p>
        <p><strong>Posta Kodu:</strong> ${data.shippingAddress.postalCode}</p>
      </div>

      <div style="background: #f0f0f0; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="margin: 0; font-size: 16px;"><strong>Toplam Tutar:</strong> ${data.totalAmount}</p>
      </div>

      <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <p style="margin: 0;"><strong>⚠️ Önemli:</strong> Üretim tamamlandığında lütfen sisteme bilgi giriniz ve ürünü paketleyip belirtilen adrese gönderin.</p>
      </div>

      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
        <p>Bu e-posta otomatik olarak 8BitWear sistemi tarafından gönderilmiştir.</p>
      </div>
    </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'orders@8bitwear.com',
      to: process.env.SUPPLIER_EMAIL || 'supplier@example.com',
      subject: `🎨 Yeni Üretim Siparişi - ${data.orderNumber}`,
      html: html,
    })
    
    console.log(`Supplier email sent for order ${data.orderNumber}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to send supplier email:', error)
    throw new Error('Tedarikçi emaili gönderilemedi')
  }
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  orderNumber: string,
  totalAmount: string
) {
  if (!resend) {
    console.warn('Resend not configured, skipping order confirmation email')
    return { success: false, error: 'Email service not configured' }
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sipariş Onayı</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 32px;">✨ Siparişiniz Alındı!</h1>
        <p style="margin: 15px 0 0 0; font-size: 18px;">Sipariş No: ${orderNumber}</p>
      </div>

      <div style="background: #fff; border: 2px solid #667eea; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
        <p style="font-size: 16px; margin-top: 0;">Merhaba,</p>
        <p>Siparişiniz başarıyla alındı ve işleme konuldu. Tasarımınız onaylandıktan sonra üretim sürecine başlayacağız.</p>
        <p style="text-align: center; font-size: 24px; color: #667eea; margin: 25px 0;"><strong>${totalAmount}</strong></p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
        <h3 style="color: #333; margin-top: 0;">📋 Süreç:</h3>
        <ol style="padding-left: 20px;">
          <li>✅ Ödeme alındı</li>
          <li>🎨 Tasarım onaylandı</li>
          <li>⏳ Üretim başlayacak</li>
          <li>📦 Kargoya verilecek</li>
          <li>🏠 Teslimat</li>
        </ol>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <p>Siparişinizi <a href="${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderNumber}" style="color: #667eea; text-decoration: none; font-weight: bold;">buradan</a> takip edebilirsiniz.</p>
      </div>

      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px;">
        <p>Sorularınız için: <a href="mailto:destek@8bitwear.com" style="color: #667eea;">destek@8bitwear.com</a></p>
        <p>© 2024 8BitWear - Kişiye Özel 3D Baskılı Giysiler</p>
      </div>
    </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'orders@8bitwear.com',
      to: customerEmail,
      subject: `✨ Siparişiniz Alındı - ${orderNumber}`,
      html: html,
    })
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    throw new Error('Sipariş onay emaili gönderilemedi')
  }
}

export async function sendShippingNotificationEmail(
  customerEmail: string,
  orderNumber: string,
  trackingNumber: string,
  trackingUrl: string
) {
  if (!resend) {
    console.warn('Resend not configured, skipping shipping notification email')
    return { success: false, error: 'Email service not configured' }
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Siparişiniz Kargoda</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 32px;">📦 Siparişiniz Yolda!</h1>
        <p style="margin: 15px 0 0 0; font-size: 18px;">Sipariş No: ${orderNumber}</p>
      </div>

      <div style="background: #fff; border: 2px solid #11998e; border-radius: 10px; padding: 25px; margin-bottom: 25px; text-align: center;">
        <p style="font-size: 16px;">Siparişiniz kargoya verildi!</p>
        <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #555;">Takip Numarası:</p>
          <p style="margin: 0; font-size: 24px; color: #11998e; font-weight: bold;">${trackingNumber}</p>
        </div>
        <a href="${trackingUrl}" style="display: inline-block; background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">Kargonu Takip Et</a>
      </div>

      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px;">
        <p>© 2024 8BitWear - Kişiye Özel 3D Baskılı Giysiler</p>
      </div>
    </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'orders@8bitwear.com',
      to: customerEmail,
      subject: `📦 Siparişiniz Kargoda - ${orderNumber}`,
      html: html,
    })
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send shipping notification email:', error)
    throw new Error('Kargo bildirim emaili gönderilemedi')
  }
}
