export function AuthScene() {
  return (
    <div className="auth-scene" aria-hidden="true">
      <div className="auth-haze" />
      <div className="auth-form3d auth-arch" style={{ right: '6%', top: '14%', width: 168, height: 300, '--rot': '-4deg', '--dur': '15s', '--delay': '-2s' } as React.CSSProperties} />
      <div className="auth-form3d auth-sphere" style={{ right: '24%', top: '40%', width: 230, height: 230, '--dur': '13s', '--delay': '-1s' } as React.CSSProperties} />
      <div className="auth-form3d auth-cube" style={{ right: '2%', bottom: '8%', width: 200, height: 200, '--rot': '8deg', '--dur': '17s' } as React.CSSProperties} />
      <div className="auth-form3d auth-sphere cool" style={{ right: '34%', bottom: '12%', width: 132, height: 132, '--dur': '12s', '--delay': '-3s' } as React.CSSProperties} />
      <div className="auth-form3d auth-capsule" style={{ right: '38%', top: '16%', width: 196, height: 96, '--rot': '-18deg', '--dur': '16s', '--delay': '-4s' } as React.CSSProperties} />
      <div className="auth-form3d auth-sphere" style={{ right: '13%', top: '8%', width: 90, height: 90, '--dur': '11s', '--delay': '-2s' } as React.CSSProperties} />
    </div>
  )
}
