import { Suspense } from 'react'
import { ConsultationsBookingPage } from '@/components/services/ConsultationsBookingPage'

export default function ConsultationsRoute() {
  return (
    <Suspense>
      <ConsultationsBookingPage />
    </Suspense>
  )
}
