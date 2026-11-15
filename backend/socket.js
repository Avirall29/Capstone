import Admin from './models/Admin.js';
import Driver from './models/Driver.js';
import { verifyToken, isDriverAllowed } from './middleware/auth.js';

const isObjectId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

/**
 * Rooms:
 *   admins            incidents, driver applications, all bus positions   (admin token required)
 *   driver-<id>       messages for one driver                             (driver token)
 *   user-<id>         arrival alerts for one passenger                    (user token)
 *   bus-<id>          live position of one bus                            (anyone)
 *   route-<id>        live positions of all buses on a route              (anyone)
 */
export function setupSocket(io) {
  io.use(async (socket, next) => {
    socket.data.auth = null;
    const auth = verifyToken(socket.handshake.auth?.token);
    try {
      if (auth?.role === 'admin' && await Admin.exists({ _id: auth.userId })) socket.data.auth = auth;
      if (auth?.role === 'driver' && isDriverAllowed(await Driver.findById(auth.userId).select('status isActive'))) {
        socket.data.auth = auth;
      }
      if (auth?.role === 'user') socket.data.auth = auth;
    } catch {
      // invalid ids etc.: treat as anonymous
    }
    next();
  });

  io.on('connection', (socket) => {
    const auth = socket.data.auth;
    if (auth?.role === 'admin') socket.join('admins');
    if (auth?.role === 'driver') socket.join(`driver-${auth.userId}`);
    if (auth?.role === 'user') socket.join(`user-${auth.userId}`);

    socket.on('subscribe', (busId) => isObjectId(busId) && socket.join(`bus-${busId}`));
    socket.on('unsubscribe', (busId) => isObjectId(busId) && socket.leave(`bus-${busId}`));
    socket.on('subscribe-route', (routeId) => isObjectId(routeId) && socket.join(`route-${routeId}`));
    socket.on('unsubscribe-route', (routeId) => isObjectId(routeId) && socket.leave(`route-${routeId}`));
  });
}
