import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export const initSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      // Allow local dev ports used by Vite (5173, 5174) and adapt as needed
      origin: ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Usuario conectado: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log('🔥 Usuario desconectado');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado");
  }
  return io;
};