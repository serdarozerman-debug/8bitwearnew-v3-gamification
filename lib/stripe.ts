import Stripe from 'stripe'

// Stripe is optional - only initialize if key is provided
const stripeKey = process.env.STRIPE_SECRET_KEY || ''

export const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
}) : null

export interface CreatePaymentIntentParams {
  amount: number // kuruş cinsinden
  orderId: string
  customerEmail: string
  metadata?: Record<string, string>
}

export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  const { amount, orderId, customerEmail, metadata } = params

  if (!stripe) {
    throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.')
  }

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
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Failed to retrieve payment intent:', error)
    throw new Error('Ödeme bilgisi alınamadı')
  }
}

export async function createRefund(paymentIntentId: string, amount?: number) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
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
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  
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
