// // server/server.js
// const express = require('express');
// const http = require('http');
// const WebSocket = require('ws');
// const path = require('path');
// const { createRoomIfNotExists, getRoom } = require('./rooms');
// const { RoomState } = require('./drawing-state');

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });

// const STATIC_DIR = path.join(__dirname, '..', 'client');
// app.use(express.static(STATIC_DIR));

// // Health
// app.get('/health', (req, res) => res.send('ok'));

// // WebSocket protocol:
// // messages are JSON with {type, payload}
// // types: join, cursor, stroke_point, stroke_start, stroke_end, undo, redo, request_state
// // server broadcasts messages to other clients (with some authoritative responses)

// wss.on('connection', (ws, req) => {
//   ws.isAlive = true;
//   ws.on('pong', () => ws.isAlive = true);

//   // We'll store per-socket metadata:
//   ws.meta = { roomId: null, userId: null, color: null, name: null };

//   ws.on('message', (raw) => {
//     let msg;
//     try {
//       msg = JSON.parse(raw.toString());
//     } catch (e) {
//       console.error('Malformed message', raw.toString());
//       return;
//     }
//     handleMessage(ws, msg);
//   });

//   ws.on('close', () => {
//     // notify room users about disconnect
//     const { roomId, userId } = ws.meta;
//     if (roomId && userId) {
//       const room = getRoom(roomId);
//       if (room) {
//         room.removeClient(ws);
//         broadcastToRoom(roomId, {
//           type: 'user_left',
//           payload: { userId }
//         });
//       }
//     }
//   });
// });

// function handleMessage(ws, msg) {
//   const { type, payload } = msg;
//   switch (type) {
//     case 'join': {
//       const { roomId, userId, color, name } = payload;
//       ws.meta.roomId = roomId;
//       ws.meta.userId = userId;
//       ws.meta.color = color;
//       ws.meta.name = name;
//       createRoomIfNotExists(roomId);
//       const room = getRoom(roomId);
//       room.addClient(ws);
//       // send current state to joining client
//       ws.send(JSON.stringify({
//         type: 'init_state',
//         payload: {
//           strokes: room.getStrokes(),
//           users: room.getUsers(),
//         }
//       }));
//       // announce new user
//       broadcastToRoom(roomId, {
//         type: 'user_joined',
//         payload: { userId, color, name }
//       }, /*exclude=*/ws);
//       break;
//     }

//     case 'cursor': {
//       const { roomId } = ws.meta;
//       if (!roomId) return;
//       // broadcast cursor to other clients
//       broadcastToRoom(roomId, {
//         type: 'cursor',
//         payload: { userId: ws.meta.userId, x: payload.x, y: payload.y }
//       }, ws);
//       break;
//     }

//     case 'stroke_start': {
//       const { roomId } = ws.meta;
//       if (!roomId) return;
//       const room = getRoom(roomId);
//       // server creates stroke id and stores partial stroke
//       const stroke = room.startStroke({
//         userId: ws.meta.userId,
//         color: payload.color,
//         width: payload.width,
//         tool: payload.tool
//       });
//       // tell clients a stroke started with id
//       broadcastToRoom(roomId, {
//         type: 'stroke_started',
//         payload: { strokeId: stroke.id, userId: stroke.userId, color: stroke.color, width: stroke.width, tool: stroke.tool }
//       });
//       break;
//     }

//     case 'stroke_point': {
//       const { roomId } = ws.meta;
//       if (!roomId) return;
//       const room = getRoom(roomId);
//       room.addPointToActiveStroke(payload.strokeId, payload.x, payload.y);
//       // stream point to other clients for live drawing
//       broadcastToRoom(roomId, {
//         type: 'stroke_point',
//         payload: { strokeId: payload.strokeId, x: payload.x, y: payload.y }
//       }, ws);
//       break;
//     }

//     case 'stroke_end': {
//       const { roomId } = ws.meta;
//       if (!roomId) return;
//       const room = getRoom(roomId);
//       room.finishStroke(payload.strokeId);
//       // broadcast "stroke_end" to let others finalize the stroke
//       broadcastToRoom(roomId, {
//         type: 'stroke_end',
//         payload: { strokeId: payload.strokeId }
//       });
//       break;
//     }

//     case 'undo': {
//       const { roomId } = ws.meta;
//       if (!roomId) return;
//       const room = getRoom(roomId);
//       const removed = room.undo();
//       if (removed) {
//         broadcastToRoom(roomId, {
//           type: 'undo',
//           payload: { strokeId: removed.id }
//         });
//       }
//       break;
//     }

//     case 'redo': {
//       const { roomId } = ws.meta;
//       if (!roomId) return;
//       const room = getRoom(roomId);
//       const restored = room.redo();
//       if (restored) {
//         broadcastToRoom(roomId, {
//           type: 'redo',
//           payload: { stroke: restored }
//         });
//       }
//       break;
//     }

//     case 'request_state': {
//       const { roomId } = ws.meta;
//       if (!roomId) return;
//       const room = getRoom(roomId);
//       ws.send(JSON.stringify({
//         type: 'init_state',
//         payload: {
//           strokes: room.getStrokes(),
//           users: room.getUsers(),
//         }
//       }));
//       break;
//     }

//     default:
//       console.warn('Unknown message type', type);
//   }
// }

// function broadcastToRoom(roomId, message, excludeWs = null) {
//   const room = getRoom(roomId);
//   if (!room) return;
//   const raw = JSON.stringify(message);
//   for (const client of room.clients) {
//     if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
//       client.send(raw);
//     }
//   }
// }

// // ping to detect dead clients
// setInterval(() => {
//   wss.clients.forEach((ws) => {
//     if (!ws.isAlive) return ws.terminate();
//     ws.isAlive = false;
//     ws.ping(() => {});
//   });
// }, 30000);

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log('Server listening on', PORT);
// });



// server/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { createRoomIfNotExists, getRoom } = require('./rooms');
const { RoomState } = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const STATIC_DIR = path.join(__dirname, '..', 'client');
app.use(express.static(STATIC_DIR));

app.get('/health', (req, res) => res.send('ok'));

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.meta = { roomId: null, userId: null, color: null, name: null };

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      console.error('Malformed message', raw.toString());
      return;
    }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    const { roomId, userId } = ws.meta;
    if (roomId && userId) {
      const room = getRoom(roomId);
      if (room) {
        room.removeClient(ws);
        broadcastToRoom(roomId, {
          type: 'user_left',
          payload: { userId }
        });
      }
    }
  });
});

function handleMessage(ws, msg) {
  const { type, payload = {} } = msg;
  switch (type) {
    case 'join': {
      const { roomId, userId, color, name } = payload;
      ws.meta.roomId = roomId;
      ws.meta.userId = userId;
      ws.meta.color = color;
      ws.meta.name = name;
      createRoomIfNotExists(roomId);
      const room = getRoom(roomId);
      room.addClient(ws);
      // send current state to joining client
      ws.send(JSON.stringify({
        type: 'init_state',
        payload: room.exportState()
      }));
      // announce new user
      broadcastToRoom(roomId, {
        type: 'user_joined',
        payload: { userId, color, name }
      }, ws);
      break;
    }

    case 'cursor': {
      const { roomId } = ws.meta;
      if (!roomId) return;
      broadcastToRoom(roomId, {
        type: 'cursor',
        payload: { userId: ws.meta.userId, x: payload.x, y: payload.y }
      }, ws);
      break;
    }

    case 'stroke_start': {
      const { roomId } = ws.meta;
      if (!roomId) return;
      const room = getRoom(roomId);
      const stroke = room.startStroke({
        userId: ws.meta.userId,
        color: payload.color,
        width: payload.width,
        tool: payload.tool
      });
      // send id to all clients
      broadcastToRoom(roomId, {
        type: 'stroke_started',
        payload: { strokeId: stroke.id, userId: stroke.userId, color: stroke.color, width: stroke.width, tool: stroke.tool }
      });
      break;
    }

    case 'stroke_point': {
      const { roomId } = ws.meta;
      if (!roomId) return;
      const room = getRoom(roomId);
      room.addPointToActiveStroke(payload.strokeId, payload.x, payload.y);
      broadcastToRoom(roomId, {
        type: 'stroke_point',
        payload: { strokeId: payload.strokeId, x: payload.x, y: payload.y }
      }, ws);
      break;
    }

    case 'stroke_end': {
      const { roomId } = ws.meta;
      if (!roomId) return;
      const room = getRoom(roomId);
      const finished = room.finishStroke(payload.strokeId);
      if (finished) {
        // broadcast stroke_end and include finished stroke metadata (so clients can be authoritative)
        broadcastToRoom(roomId, {
          type: 'stroke_end',
          payload: { strokeId: finished.id, stroke: finished }
        });
      }
      break;
    }

    case 'undo': {
      // payload can be { userScoped: true } to indicate per-user undo
      const { roomId, userId } = ws.meta;
      if (!roomId) return;
      const room = getRoom(roomId);
      let removed = null;
      if (payload && payload.userScoped) {
        removed = room.undoByUser(userId);
      } else {
        removed = room.undoGlobal();
      }
      if (removed) {
        broadcastToRoom(roomId, {
          type: 'undo',
          payload: { strokeId: removed.id, userId: removed.userId }
        });
      }
      break;
    }

    case 'redo': {
      const { roomId } = ws.meta;
      if (!roomId) return;
      const room = getRoom(roomId);
      const restored = room.redo();
      if (restored) {
        broadcastToRoom(roomId, {
          type: 'redo',
          payload: { stroke: restored }
        });
      }
      break;
    }

    case 'request_state': {
      const { roomId } = ws.meta;
      if (!roomId) return;
      const room = getRoom(roomId);
      ws.send(JSON.stringify({
        type: 'init_state',
        payload: room.exportState()
      }));
      break;
    }

    default:
      console.warn('Unknown message type', type);
  }
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = getRoom(roomId);
  if (!room) return;
  const raw = JSON.stringify(message);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(raw);
    }
  }
}

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
