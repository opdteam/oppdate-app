import { Suspense } from 'react'
import { EbooksReaderPage } from '@/components/services/EbooksReaderPage'

export default function EbooksReaderRoute() {
  return (
    <Suspense>
      <EbooksReaderPage />
    </Suspense>
  )
}
