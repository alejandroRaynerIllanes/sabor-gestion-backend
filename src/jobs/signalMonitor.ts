import Pedido from '../models/Pedido';
import { activeDeliveries } from '../socket/socket'; // Importamos el Map del socket

export const startSignalMonitor = () => {
  // Se ejecuta cada 1 minuto
  setInterval(async () => {
    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos de señal muerta

    for (const [orderId, lastPing] of activeDeliveries.entries()) {
      if (now - lastPing > TIMEOUT_MS) {
        // Cambiar estado a Señal débil
        await Pedido.findByIdAndUpdate(orderId, { estado: 'Senal_Debil' });
        console.warn(`[Monitor] Señal perdida para el pedido: ${orderId}`);
        
        // Limpiar del monitor para no seguir haciendo queries
        activeDeliveries.delete(orderId);
      }
    }
  }, 60000); 
};