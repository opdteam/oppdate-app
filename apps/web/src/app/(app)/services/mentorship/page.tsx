import { Suspense } from 'react'
import { MentorshipListingPage } from '@/components/services/MentorshipListingPage'

export default function MentorshipRoute() {
  return (
    <Suspense>
      <MentorshipListingPage />
    </Suspense>
  )
}
