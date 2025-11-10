// server/rooms.js
const { RoomState } = require('./drawing-state');

const rooms = new Map(); // roomId -> RoomState

function createRoomIfNotExists(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new RoomState(roomId));
  }
  return rooms.get(roomId);
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

module.exports = { createRoomIfNotExists, getRoom };
