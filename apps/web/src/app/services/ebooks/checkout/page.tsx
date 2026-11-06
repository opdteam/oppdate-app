import { Suspense } from 'react'
import { EbooksCheckoutPage } from '@/components/services/EbooksCheckoutPage'

export default function EbooksCheckoutRoute() {
  return (
    <Suspense>
      <EbooksCheckoutPage />
    </Suspense>
  )
}
