import { Suspense } from 'react'
import { ConsultationsBookingPage } from '@/components/services/ConsultationsBookingPage'

export default function ConsultationsBookingRoute() {
  return (
    <Suspense>
      <ConsultationsBookingPage />
    </Suspense>
  )
}
