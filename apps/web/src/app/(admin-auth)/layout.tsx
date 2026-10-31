import '../admin.css'

export const metadata = {
  title: 'OppDate Admin',
}

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
