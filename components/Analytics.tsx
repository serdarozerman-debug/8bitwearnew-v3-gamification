'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function AnalyticsContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Session ID oluştur veya al
    let sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`
      localStorage.setItem('sessionId', sessionId)
    }

    // UTM parametrelerini al ve sakla
    const utmSource = searchParams.get('utm_source')
    const utmMedium = searchParams.get('utm_medium')
    const utmCampaign = searchParams.get('utm_campaign')
    const utmContent = searchParams.get('utm_content')
    const utmTerm = searchParams.get('utm_term')

    if (utmSource || utmMedium || utmCampaign) {
      const utmData = {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        timestamp: Date.now(),
      }
      localStorage.setItem('utmData', JSON.stringify(utmData))
    }

    // Sayfa görüntüleme tracking
    trackPageView(sessionId, pathname)

    // Google Analytics (eğer varsa)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: pathname,
      })
    }
  }, [pathname, searchParams])

  return null
}

export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsContent />
    </Suspense>
  )
}

async function trackPageView(sessionId: string, page: string) {
  try {
    // UTM data'yı al
    const utmDataStr = localStorage.getItem('utmData')
    let utmData = null
    if (utmDataStr) {
      utmData = JSON.parse(utmDataStr)
    }

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({
        sessionId,
        page,
        event: 'page_view',
        referrer: document.referrer,
        ...utmData,
      }),
    })
  } catch (error) {
    console.error('Analytics tracking error:', error)
  }
}
