export default function RootLoading() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAF6F1',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid rgba(122, 45, 5, 0.12)',
          borderTopColor: '#7A2D05',
          animation: 'oppdate-spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes oppdate-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
