import Pedido from '../models/Pedido';

export const startAssignmentTimeout = () => {
  // Se ejecuta cada 30 segundos evaluando pedidos
  setInterval(async () => {
    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos
    const limiteTiempo = new Date(Date.now() - TIMEOUT_MS);

    try {
      // Buscar pedidos asignados que sigan pendientes de aceptación despues de 3 minutos
      const pedidosExpirados = await Pedido.find({
        estado: 'Pendiente_de_Aceptacion',
        createdAt: { $lt: limiteTiempo },
        repartidorId: { $ne: null } 
      });

      for (const pedido of pedidosExpirados) {
        // SOLUCIÓN: Usar undefined para satisfacer a TypeScript
        pedido.repartidorId = undefined;
        
        // Opcional: Aquí podrías disparar el algoritmo para buscar al siguiente disponible
        await pedido.save();
        console.log(`[Timeout] Pedido ${pedido._id} desvinculado por falta de respuesta.`);
      }
    } catch (error) {
      console.error('[Timeout] Error al procesar desvinculaciones de pedidos:', error);
    }
  }, 30000);
};