import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

export interface CreatePaymentIntentParams {
  amount: number // kuruş cinsinden
  orderId: string
  customerEmail: string
  metadata?: Record<string, string>
}

export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  const { amount, orderId, customerEmail, metadata } = params

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe kuruş cinsinden bekler
      currency: 'try',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId,
        ...metadata,
      },
      receipt_email: customerEmail,
      description: `8BitWear Sipariş - ${orderId}`,
    })

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error('Stripe payment intent creation failed:', error)
    throw new Error('Ödeme oluşturulamadı')
  }
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Failed to retrieve payment intent:', error)
    throw new Error('Ödeme bilgisi alınamadı')
  }
}

export async function createRefund(paymentIntentId: string, amount?: number) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount) : undefined, // undefined = tam iade
    })
    return refund
  } catch (error) {
    console.error('Failed to create refund:', error)
    throw new Error('İade işlemi başarısız')
  }
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    return event
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Webhook doğrulaması başarısız')
  }
}
