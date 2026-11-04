declare module 'geoip-lite' {
  interface Geo {
    country: string
    region: string
    city: string
    ll: [number, number]
    timezone: string
  }
  function lookup(ip: string): Geo | null
  export default { lookup }
}
