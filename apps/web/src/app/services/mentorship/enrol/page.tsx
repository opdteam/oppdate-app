import { Suspense } from 'react'
import { MentorshipEnrolPage } from '@/components/services/MentorshipEnrolPage'

export default function MentorshipEnrolRoute() {
  return (
    <Suspense>
      <MentorshipEnrolPage />
    </Suspense>
  )
}
