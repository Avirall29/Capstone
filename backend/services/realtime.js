// Holds the Socket.IO server so services (not just route handlers) can broadcast.
let io = null;

export const setIO = (server) => { io = server; };
export const getIO = () => io;

/** Admin-only events (incidents, driver applications). Never broadcast these globally. */
export const emitToAdmins = (event, data) => io?.to('admins').emit(event, data);
export const emitToDriver = (driverId, event, data) => io?.to(`driver-${driverId}`).emit(event, data);
export const emitToUser = (userId, event, data) => io?.to(`user-${userId}`).emit(event, data);
