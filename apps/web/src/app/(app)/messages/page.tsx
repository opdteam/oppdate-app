import { Suspense } from 'react'
import { MessagesPage } from '@/components/messages/MessagesPage'

export default function Page() {
  return (
    <Suspense>
      <MessagesPage />
    </Suspense>
  )
}
