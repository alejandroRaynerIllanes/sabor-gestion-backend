import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export const initSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:5173", // En producción pon la URL de tu frontend (ej: http://localhost:5173)
      methods: ["GET", "POST", "PATCH"]
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