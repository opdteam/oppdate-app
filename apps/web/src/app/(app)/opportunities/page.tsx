import { Suspense } from 'react'
import { ListingsPage } from '@/components/opportunities/ListingsPage'

export default function Page() {
  return (
    <Suspense>
      <ListingsPage />
    </Suspense>
  )
}
