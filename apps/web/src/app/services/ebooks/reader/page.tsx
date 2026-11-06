import { Suspense } from 'react'
import { EbooksReaderPage } from '@/components/services/EbooksReaderPage'

export const dynamic = 'force-dynamic'

export default function EbooksReaderRoute() {
  return (
    <Suspense>
      <EbooksReaderPage />
    </Suspense>
  )
}
