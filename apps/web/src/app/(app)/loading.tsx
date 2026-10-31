export default function AppLoading() {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(122, 45, 5, 0.12)',
        borderTopColor: '#7A2D05',
        animation: 'oppdate-spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes oppdate-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
