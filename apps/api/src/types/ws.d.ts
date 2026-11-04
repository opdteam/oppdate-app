declare module 'ws' {
  import { EventEmitter } from 'events'

  class WebSocket extends EventEmitter {
    static CONNECTING: number
    static OPEN: number
    static CLOSING: number
    static CLOSED: number
    readyState: number
    send(data: string | Buffer, cb?: (err?: Error) => void): void
    ping(data?: string | Buffer, mask?: boolean, cb?: (err: Error) => void): void
    close(code?: number, reason?: string): void
    on(event: 'message', listener: (data: Buffer) => void): this
    on(event: 'close', listener: (code: number, reason: Buffer) => void): this
    on(event: 'error', listener: (err: Error) => void): this
    on(event: string, listener: (...args: unknown[]) => void): this
  }

  export { WebSocket }
  export default WebSocket
}
