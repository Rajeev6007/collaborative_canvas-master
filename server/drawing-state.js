// // server/drawing-state.js
// const { v4: uuidv4 } = require('uuid');

// class RoomState {
//   constructor(roomId) {
//     this.roomId = roomId;
//     this.strokes = []; // finished strokes
//     this.activeStrokes = new Map(); // strokeId -> partial stroke
//     this.undoStack = []; // finished strokes for undo
//     this.redoStack = [];
//     this.clients = new Set(); // WebSocket clients
//     this.userMeta = new Map(); // userId -> {color,name}
//   }

//   addClient(ws) {
//     this.clients.add(ws);
//     if (ws.meta && ws.meta.userId) {
//       this.userMeta.set(ws.meta.userId, { color: ws.meta.color, name: ws.meta.name });
//     }
//   }

//   removeClient(ws) {
//     this.clients.delete(ws);
//   }

//   getUsers() {
//     const users = [];
//     for (const [userId, meta] of this.userMeta) {
//       users.push({ userId, ...meta });
//     }
//     return users;
//   }

//   // start an in-progress stroke
//   startStroke({ userId, color, width, tool }) {
//     const id = uuidv4();
//     const stroke = { id, userId, color, width, tool, points: [] };
//     this.activeStrokes.set(id, stroke);
//     return stroke;
//   }

//   addPointToActiveStroke(strokeId, x, y) {
//     const s = this.activeStrokes.get(strokeId);
//     if (!s) return;
//     s.points.push([x, y]);
//   }

//   finishStroke(strokeId) {
//     const s = this.activeStrokes.get(strokeId);
//     if (!s) return null;
//     this.activeStrokes.delete(strokeId);
//     this.strokes.push(s);
//     this.undoStack.push(s);
//     this.redoStack = [];
//     return s;
//   }

//   getStrokes() {
//     return this.strokes;
//   }

//   undo() {
//     if (this.undoStack.length === 0) return null;
//     const stroke = this.undoStack.pop();
//     this.redoStack.push(stroke);
//     for (let i = this.strokes.length - 1; i >= 0; i--) {
//       if (this.strokes[i].id === stroke.id) {
//         this.strokes.splice(i, 1);
//         break;
//       }
//     }
//     return stroke;
//   }

//   redo() {
//     if (this.redoStack.length === 0) return null;
//     const stroke = this.redoStack.pop();
//     this.strokes.push(stroke);
//     this.undoStack.push(stroke);
//     return stroke;
//   }
// }

// module.exports = { RoomState };






// server/drawing-state.js
// const { v4: uuidv4 } = require('uuid');
// const fs = require('fs');
// const path = require('path');

// const SNAP_DIR = path.join(__dirname, '..', 'snapshots');
// // ensure snapshot dir exists
// try { fs.mkdirSync(SNAP_DIR, { recursive: true }); } catch (e) {}

// class RoomState {
//   constructor(roomId) {
//     this.roomId = roomId;
//     this.strokes = []; // finished strokes
//     this.activeStrokes = new Map(); // strokeId -> partial stroke
//     this.undoStack = []; // finished strokes for undo
//     this.redoStack = [];
//     this.clients = new Set(); // WebSocket clients
//     this.userMeta = new Map(); // userId -> {color,name}
//     // autosave throttle
//     this._dirty = false;
//     this._saveTimer = null;
//   }

//   addClient(ws) {
//     this.clients.add(ws);
//     if (ws.meta && ws.meta.userId) {
//       this.userMeta.set(ws.meta.userId, { color: ws.meta.color, name: ws.meta.name });
//     }
//   }

//   removeClient(ws) {
//     this.clients.delete(ws);
//   }

//   getUsers() {
//     const users = [];
//     for (const [userId, meta] of this.userMeta) {
//       users.push({ userId, ...meta });
//     }
//     return users;
//   }

//   // create a new stroke that's in-progress
//   startStroke({ userId, color, width, tool }) {
//     const id = uuidv4();
//     const stroke = { id, userId, color, width, tool, points: [] };
//     this.activeStrokes.set(id, stroke);
//     return stroke;
//   }

//   addPointToActiveStroke(strokeId, x, y) {
//     const s = this.activeStrokes.get(strokeId);
//     if (!s) return;
//     s.points.push([x, y]);
//   }

//   finishStroke(strokeId) {
//     const s = this.activeStrokes.get(strokeId);
//     if (!s) return null;
//     this.activeStrokes.delete(strokeId);
//     this.strokes.push(s);
//     this.undoStack.push(s);
//     this.redoStack = [];
//     this.markDirty(); // mark that we should save snapshot soon
//     return s;
//   }

//   getStrokes() {
//     return this.strokes;
//   }

//   undo() {
//     if (this.undoStack.length === 0) return null;
//     const stroke = this.undoStack.pop();
//     this.redoStack.push(stroke);
//     for (let i = this.strokes.length - 1; i >= 0; i--) {
//       if (this.strokes[i].id === stroke.id) {
//         this.strokes.splice(i, 1);
//         break;
//       }
//     }
//     this.markDirty();
//     return stroke;
//   }

//   redo() {
//     if (this.redoStack.length === 0) return null;
//     const stroke = this.redoStack.pop();
//     this.strokes.push(stroke);
//     this.undoStack.push(stroke);
//     this.markDirty();
//     return stroke;
//   }

//   markDirty() {
//     this._dirty = true;
//     if (this._saveTimer) return;
//     // debounce save for 1s to avoid too many disk writes
//     this._saveTimer = setTimeout(() => {
//       this._saveTimer = null;
//       if (this._dirty) {
//         this.saveSnapshot();
//         this._dirty = false;
//       }
//     }, 1000);
//   }

//   saveSnapshot() {
//     const file = path.join(SNAP_DIR, `${this.roomId}.json`);
//     const payload = {
//       strokes: this.strokes,
//       // we don't persist activeStrokes since they are ephemeral
//       undoStack: this.undoStack.map(s => s.id),
//       redoStack: this.redoStack.map(s => s.id),
//     };
//     try {
//       fs.writeFileSync(file, JSON.stringify(payload));
//       // console.log('Saved snapshot for', this.roomId);
//     } catch (e) {
//       console.error('Failed to write snapshot', file, e);
//     }
//   }

//   // For convenience: export minimal public state
//   exportState() {
//     return { strokes: this.strokes, users: this.getUsers() };
//   }

//   // static helper to load snapshot (returns a new RoomState primed with snapshot)
//   static loadSnapshot(roomId) {
//     const file = path.join(SNAP_DIR, `${roomId}.json`);
//     if (!fs.existsSync(file)) return null;
//     try {
//       const raw = fs.readFileSync(file, 'utf8');
//       const parsed = JSON.parse(raw);
//       const rs = new RoomState(roomId);
//       rs.strokes = parsed.strokes || [];
//       // rebuild undo/redo stacks by matching ids
//       if (Array.isArray(parsed.undoStack)) {
//         rs.undoStack = parsed.undoStack.map(id => rs.strokes.find(s => s.id === id)).filter(Boolean);
//       }
//       if (Array.isArray(parsed.redoStack)) {
//         rs.redoStack = parsed.redoStack.map(id => rs.strokes.find(s => s.id === id)).filter(Boolean);
//       }
//       return rs;
//     } catch (e) {
//       console.error('Failed to load snapshot', file, e);
//       return null;
//     }
//   }
// }

// module.exports = { RoomState };







// server/drawing-state.js
// RoomState with per-user undo/redo and server timestamps for deterministic ordering.

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const SNAP_DIR = path.join(__dirname, '..', 'snapshots');
try { fs.mkdirSync(SNAP_DIR, { recursive: true }); } catch (e) {}

class RoomState {
  constructor(roomId) {
    this.roomId = roomId;
    this.strokes = []; // finished strokes
    this.activeStrokes = new Map(); // strokeId -> partial stroke
    this.undoStack = []; // finished strokes for undo (global stack of strokes in finish order)
    this.redoStack = [];
    this.clients = new Set(); // WebSocket clients
    this.userMeta = new Map(); // userId -> {color,name}

    // autosave debounce
    this._dirty = false;
    this._saveTimer = null;
  }

  addClient(ws) {
    this.clients.add(ws);
    if (ws.meta && ws.meta.userId) {
      this.userMeta.set(ws.meta.userId, { color: ws.meta.color, name: ws.meta.name });
    }
  }

  removeClient(ws) {
    this.clients.delete(ws);
  }

  getUsers() {
    const users = [];
    for (const [userId, meta] of this.userMeta) {
      users.push({ userId, ...meta });
    }
    return users;
  }

  // start an in-progress stroke
  startStroke({ userId, color, width, tool }) {
    const id = uuidv4();
    const stroke = { id, userId, color, width, tool, points: [], startedAt: Date.now(), finishedAt: null };
    this.activeStrokes.set(id, stroke);
    return stroke;
  }

  addPointToActiveStroke(strokeId, x, y) {
    const s = this.activeStrokes.get(strokeId);
    if (!s) return;
    s.points.push([x, y]);
  }

  // finalize stroke: assign finishedAt timestamp and move into finished list
  finishStroke(strokeId) {
    const s = this.activeStrokes.get(strokeId);
    if (!s) return null;
    this.activeStrokes.delete(strokeId);
    s.finishedAt = Date.now();
    this.strokes.push(s);
    this.undoStack.push(s);
    // clear redo on new action
    this.redoStack = [];
    this.markDirty();
    return s;
  }

  getStrokes() {
    // ensure canonical order by finishedAt (older first). This prevents non-determinism.
    return this.strokes.slice().sort((a, b) => (a.finishedAt || 0) - (b.finishedAt || 0));
  }

  // GLOBAL undo (old behavior) - pops last finished stroke globally
  undoGlobal() {
    if (this.undoStack.length === 0) return null;
    const stroke = this.undoStack.pop();
    this.redoStack.push(stroke);
    // remove from strokes
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      if (this.strokes[i].id === stroke.id) {
        this.strokes.splice(i, 1);
        break;
      }
    }
    this.markDirty();
    return stroke;
  }

  // USER-SCOPED undo: remove last finished stroke created by userId
  undoByUser(userId) {
    // find last stroke in finished strokes authored by userId
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const s = this.strokes[i];
      if (s.userId === userId) {
        // remove
        this.strokes.splice(i, 1);
        // also remove from undoStack (last occurrence)
        for (let j = this.undoStack.length - 1; j >= 0; j--) {
          if (this.undoStack[j].id === s.id) {
            this.undoStack.splice(j, 1);
            break;
          }
        }
        this.redoStack.push(s);
        this.markDirty();
        return s;
      }
    }
    return null;
  }

  // REDO for user-scoped or global isn't user-specific in this simplified model:
  // redo will restore the last item in redoStack (global)
  redo() {
    if (this.redoStack.length === 0) return null;
    const stroke = this.redoStack.pop();
    // set a new finishedAt to place appropriately (or keep original finishedAt to preserve order)
    // We'll keep original finishedAt to preserve chronological ordering.
    this.strokes.push(stroke);
    this.undoStack.push(stroke);
    this.markDirty();
    return stroke;
  }

  // Generic removal by strokeId (helper)
  removeStrokeById(strokeId) {
    let removed = null;
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      if (this.strokes[i].id === strokeId) {
        removed = this.strokes.splice(i, 1)[0];
        break;
      }
    }
    if (removed) {
      // remove from undoStack too
      for (let j = this.undoStack.length - 1; j >= 0; j--) {
        if (this.undoStack[j].id === strokeId) {
          this.undoStack.splice(j, 1);
          break;
        }
      }
      this.redoStack.push(removed);
      this.markDirty();
    }
    return removed;
  }

  markDirty() {
    this._dirty = true;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      if (this._dirty) {
        this.saveSnapshot();
        this._dirty = false;
      }
    }, 1000);
  }

  saveSnapshot() {
    const file = path.join(SNAP_DIR, `${this.roomId}.json`);
    const payload = {
      strokes: this.strokes,
      undoStack: this.undoStack.map(s => s.id),
      redoStack: this.redoStack.map(s => s.id),
    };
    try {
      fs.writeFileSync(file, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to write snapshot', file, e);
    }
  }

  exportState() {
    return { strokes: this.getStrokes(), users: this.getUsers() };
  }

  // static helper to load snapshot
  static loadSnapshot(roomId) {
    const file = path.join(SNAP_DIR, `${roomId}.json`);
    if (!fs.existsSync(file)) return null;
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      const rs = new RoomState(roomId);
      rs.strokes = parsed.strokes || [];
      if (Array.isArray(parsed.undoStack)) {
        rs.undoStack = parsed.undoStack.map(id => rs.strokes.find(s => s.id === id)).filter(Boolean);
      }
      if (Array.isArray(parsed.redoStack)) {
        rs.redoStack = parsed.redoStack.map(id => rs.strokes.find(s => s.id === id)).filter(Boolean);
      }
      return rs;
    } catch (e) {
      console.error('Failed to load snapshot', file, e);
      return null;
    }
  }
}

module.exports = { RoomState };

