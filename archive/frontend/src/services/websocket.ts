import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000'
    
    socket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => {
      console.log('Socket.IO connected')
    })

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
    })
  }

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export default getSocket

