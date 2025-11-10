// // client/main.js
// // Initialize WS, CanvasManager, UI wiring

// (function () {
//   const params = new URLSearchParams(location.search);
//   const roomParam = params.get('room') || 'default';
//   const roomLabel = document.getElementById('roomLabel');
//   roomLabel.textContent = 'Room: ' + roomParam;

//   // create WS client (connect to same host)
//   const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
//   const wsUrl = `${protocol}://${location.host}`;
//   const ws = new WSClient(wsUrl);
//   ws.connect();

//   // simple user identity
//   const userId = (localStorage.getItem('collab_user') || ('u-' + Math.random().toString(36).slice(2,9)));
//   localStorage.setItem('collab_user', userId);
//   const color = localStorage.getItem('collab_color') || randomColor();
//   localStorage.setItem('collab_color', color);

//   const canvasEl = document.getElementById('draw');
//   const cursors = document.getElementById('cursors');
//   const cm = new CanvasManager(canvasEl, cursors, ws, {});
//   cm.setColor(color);
//   cm.setWidth(Number(document.getElementById('width').value));
//   cm.setTool(document.getElementById('toolSelect').value);

//   // bind UI
//   document.getElementById('colorPicker').value = color;
//   document.getElementById('colorPicker').addEventListener('input', (e) => {
//     const c = e.target.value;
//     cm.setColor(c);
//     localStorage.setItem('collab_color', c);
//   });
//   document.getElementById('width').addEventListener('input', (e) => {
//     const w = Number(e.target.value);
//     cm.setWidth(w);
//   });
//   document.getElementById('toolSelect').addEventListener('change', (e) => {
//     cm.setTool(e.target.value);
//   });

//   document.getElementById('undo').addEventListener('click', () => ws.send('undo', {}));
//   document.getElementById('redo').addEventListener('click', () => ws.send('redo', {}));

//   cm.bindUserInput(userId);

//   // handle incoming cursor updates to show other users
//   ws.on('cursor', (payload) => {
//     // payload: { userId, x, y }
//     const userMeta = window._usersMeta && window._usersMeta[payload.userId];
//     const color = userMeta ? userMeta.color : '#000';
//     cm.updateCursor(payload.userId, payload.x, payload.y, color);
//     // remove after a short timeout if no updates
//     if (cm._cursorTimers && cm._cursorTimers[payload.userId]) {
//       clearTimeout(cm._cursorTimers[payload.userId]);
//     } else {
//       cm._cursorTimers = cm._cursorTimers || {};
//     }
//     cm._cursorTimers[payload.userId] = setTimeout(() => cm.removeCursor(payload.userId), 2500);
//   });

//   ws.on('user_joined', (payload) => {
//     // payload: { userId, color, name }
//     window._usersMeta = window._usersMeta || {};
//     window._usersMeta[payload.userId] = { color: payload.color, name: payload.name || payload.userId };
//     refreshUsersList();
//   });

//   ws.on('user_left', (payload) => {
//     if (window._usersMeta) delete window._usersMeta[payload.userId];
//     cm.removeCursor(payload.userId);
//     refreshUsersList();
//   });

//   ws.on('init_state', (payload) => {
//     // payload: { strokes, users }
//     window._usersMeta = window._usersMeta || {};
//     for (const u of payload.users || []) {
//       window._usersMeta[u.userId] = { color: u.color, name: u.name || u.userId };
//     }
//     refreshUsersList();
//     cm.fullRepaint(payload.strokes || []);
//   });

//   function refreshUsersList() {
//     const list = document.getElementById('usersList');
//     list.innerHTML = '';
//     const meta = window._usersMeta || {};
//     for (const id in meta) {
//       const li = document.createElement('li');
//       const dot = document.createElement('span');
//       dot.style.width = '12px';
//       dot.style.height = '12px';
//       dot.style.borderRadius = '50%';
//       dot.style.background = meta[id].color || '#000';
//       li.appendChild(dot);
//       const txt = document.createElement('span');
//       txt.textContent = meta[id].name || id.slice(0,6);
//       li.appendChild(txt);
//       list.appendChild(li);
//     }
//   }

//   // join room once WS open
//   ws.on('open', () => {
//     ws.send('join', { roomId: roomParam, userId, color: color, name: userId });
//     // request state explicitly
//     ws.send('request_state', {});
//   });

//   // heartbeat: periodically send cursor (in case stationary)
//   setInterval(() => {
//     // small random cursor near center to keep presence; optional
//     ws.send('cursor', { x: 10, y: 10 });
//   }, 15000);

//   function randomColor() {
//     const h = Math.floor(Math.random()*360);
//     return `hsl(${h} 70% 30%)`;
//   }

// })();



// client/main.js
// (function () {
//   const params = new URLSearchParams(location.search);
//   const roomParam = params.get('room') || 'default';
//   const roomLabel = document.getElementById('roomLabel');
//   roomLabel.textContent = 'Room: ' + roomParam;

//   const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
//   const wsUrl = `${protocol}://${location.host}`;
//   const ws = new WSClient(wsUrl);
//   ws.connect();

//   const userId = (localStorage.getItem('collab_user') || ('u-' + Math.random().toString(36).slice(2,9)));
//   localStorage.setItem('collab_user', userId);
//   const color = localStorage.getItem('collab_color') || randomColor();
//   localStorage.setItem('collab_color', color);

//   const canvasEl = document.getElementById('draw');
//   const cursors = document.getElementById('cursors');
//   const cm = new CanvasManager(canvasEl, cursors, ws, {});
//   cm.setColor(color);
//   cm.setWidth(Number(document.getElementById('width').value));
//   cm.setTool(document.getElementById('toolSelect').value);

//   document.getElementById('colorPicker').value = color;
//   document.getElementById('colorPicker').addEventListener('input', (e) => {
//     const c = e.target.value;
//     cm.setColor(c);
//     localStorage.setItem('collab_color', c);
//   });
//   document.getElementById('width').addEventListener('input', (e) => {
//     const w = Number(e.target.value);
//     cm.setWidth(w);
//   });
//   document.getElementById('toolSelect').addEventListener('change', (e) => {
//     cm.setTool(e.target.value);
//   });

//   // UNDO: send userScoped request (undo only your last finished stroke)
//   document.getElementById('undo').addEventListener('click', () => {
//     ws.send('undo', { userScoped: true });
//   });
//   // REDO stays global
//   document.getElementById('redo').addEventListener('click', () => ws.send('redo', {}));

//   cm.bindUserInput(userId);

//   // cursor handling
//   ws.on('cursor', (payload) => {
//     const userMeta = window._usersMeta && window._usersMeta[payload.userId];
//     const color = userMeta ? userMeta.color : '#000';
//     cm.updateCursor(payload.userId, payload.x, payload.y, color);
//     if (cm._cursorTimers && cm._cursorTimers[payload.userId]) clearTimeout(cm._cursorTimers[payload.userId]);
//     cm._cursorTimers = cm._cursorTimers || {};
//     cm._cursorTimers[payload.userId] = setTimeout(() => cm.removeCursor(payload.userId), 2500);
//   });

//   ws.on('user_joined', (payload) => {
//     window._usersMeta = window._usersMeta || {};
//     window._usersMeta[payload.userId] = { color: payload.color, name: payload.name || payload.userId };
//     refreshUsersList();
//   });

//   ws.on('user_left', (payload) => {
//     if (window._usersMeta) delete window._usersMeta[payload.userId];
//     cm.removeCursor(payload.userId);
//     refreshUsersList();
//   });

//   // authoritative init state: full repaint
//   ws.on('init_state', (payload) => {
//     window._usersMeta = window._usersMeta || {};
//     for (const u of payload.users || []) {
//       window._usersMeta[u.userId] = { color: u.color, name: u.name || u.userId };
//     }
//     refreshUsersList();
//     cm.fullRepaint(payload.strokes || []);
//   });

//   // server told a stroke started (create remote placeholder)
//   ws.on('stroke_started', (payload) => {
//     cm.remoteStrokes.set(payload.strokeId, { id: payload.strokeId, points: [], color: payload.color, width: payload.width, tool: payload.tool });
//     // if it's mine, set current.strokeId for buffered sending (handled in CanvasManager)
//     if (payload.userId === userId) {
//       cm.current.strokeId = payload.strokeId;
//       if (cm.current.buffer && cm.current.buffer.length) {
//         for (const p of cm.current.buffer) {
//           ws.send('stroke_point', { strokeId: cm.current.strokeId, x: p.x, y: p.y });
//           cm.renderPoint(cm.current.strokeId, { x: p.x, y: p.y });
//         }
//         cm.current.buffer = [];
//       }
//     }
//   });

//   ws.on('stroke_point', (payload) => {
//     cm.renderPoint(payload.strokeId, { x: payload.x, y: payload.y });
//   });

//   ws.on('stroke_end', (payload) => {
//     // payload may include finished stroke
//     if (payload.stroke) {
//       // direct authoritative stroke object
//       cm.renderStroke(payload.stroke);
//     } else {
//       const s = cm.remoteStrokes.get(payload.strokeId);
//       if (s) cm.renderStroke(s);
//     }
//   });

//   // handle undo: remove stroke by id and do a full authoritative repaint to be safe
//   ws.on('undo', (payload) => {
//     // simple approach: request authoritative state (server will reply with init_state)
//     ws.send('request_state', {});
//     // visual hint could be added here (e.g., flash)
//   });

//   ws.on('redo', (payload) => {
//     ws.send('request_state', {});
//   });

//   ws.on('open', () => {
//     ws.send('join', { roomId: roomParam, userId, color: color, name: userId });
//     ws.send('request_state', {});
//   });

//   function refreshUsersList() {
//     const list = document.getElementById('usersList');
//     list.innerHTML = '';
//     const meta = window._usersMeta || {};
//     for (const id in meta) {
//       const li = document.createElement('li');
//       const dot = document.createElement('span');
//       dot.style.width = '12px';
//       dot.style.height = '12px';
//       dot.style.borderRadius = '50%';
//       dot.style.display = 'inline-block';
//       dot.style.marginRight = '8px';
//       dot.style.background = meta[id].color || '#000';
//       li.appendChild(dot);
//       const txt = document.createElement('span');
//       txt.textContent = meta[id].name || id.slice(0,6);
//       li.appendChild(txt);
//       list.appendChild(li);
//     }
//   }

//   // tiny heartbeat to keep presence alive
//   setInterval(() => {
//     ws.send('cursor', { x: 10, y: 10 });
//   }, 15000);

//   function randomColor() {
//     const h = Math.floor(Math.random()*360);
//     return `hsl(${h} 70% 30%)`;
//   }

// })();
// client/main.js
(function () {
  const params = new URLSearchParams(location.search);
  const initialRoomFromURL = params.get('room') || null;

  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsBaseUrl = `${protocol}://${location.host}`;

  // --- User identity management ---
  let userId = localStorage.getItem('collab_user');
  let userName = localStorage.getItem('collab_name');
  let userColor = localStorage.getItem('collab_color');

  if (!userId) {
    userId = 'user-' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('collab_user', userId);
  }

  if (!userName) {
    userName = prompt('Enter your display name:', 'Guest') || userId;
    localStorage.setItem('collab_name', userName);
  }

  if (!userColor) {
    userColor = (function randomColor() {
      const h = Math.floor(Math.random() * 360);
      return `hsl(${h} 70% 30%)`;
    })();
    localStorage.setItem('collab_color', userColor);
  }

  // DOM refs
  const tabsContainer = document.getElementById('tabs');
  const newCanvasBtn = document.getElementById('newCanvasBtn');
  const multiCanvasArea = document.getElementById('multiCanvasArea');
  const roomLabel = document.getElementById('roomLabel');

  // state
  const instances = {}; // roomId -> { id, ws, cm, tabEl, wrapperEl, title }
  let activeRoomId = null;
  let canvasCount = 0;

  // helper: create URL-safe slug from a name
  function slugify(name) {
    return name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')           // spaces -> hyphens
      .replace(/[^\w\-]+/g, '')       // remove non-word chars
      .replace(/\-\-+/g, '-')         // collapse multiple hyphens
      .replace(/^-+/, '')             // trim starting hyphens
      .replace(/-+$/, '');            // trim ending hyphens
  }

  // ensure unique slug (append -2, -3 if needed)
  function uniqueSlug(base) {
    if (!instances[base]) return base;
    let i = 2;
    while (instances[`${base}-${i}`]) i++;
    return `${base}-${i}`;
  }

  // Toolbar wiring will always affect active instance
  function getActiveInstance() {
    if (!activeRoomId) return null;
    return instances[activeRoomId] || null;
  }

  // Create canvas instance and dedicated websocket
  function createCanvas(roomId = null, title = null, activate = true) {
    // If no roomId provided, generate random slug
    const id = roomId || ('room-' + Math.random().toString(36).slice(2, 7));
    if (instances[id]) {
      if (activate) activateCanvas(id);
      return instances[id];
    }

    // DOM: tab
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.id = id;
    tab.textContent = title || id;
    tab.title = title || id;

    const close = document.createElement('span');
    close.className = 'close';
    close.textContent = '✕';
    tab.appendChild(close);
    tabsContainer.appendChild(tab);

    // DOM: canvas wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-instance';
    wrapper.dataset.id = id;

    // create canvas element
    const canvasEl = document.createElement('canvas');
    // set internal resolution (adjust as needed)
    canvasEl.width = 1600;
    canvasEl.height = 900;
    wrapper.appendChild(canvasEl);

    // cursors overlay
    const cursors = document.createElement('div');
    cursors.className = 'cursors';
    wrapper.appendChild(cursors);

    multiCanvasArea.appendChild(wrapper);

    // create independent WS for this room
    const ws = new WSClient(wsBaseUrl);
    ws.connect();

    // create CanvasManager bound to this canvas and its ws
    const cm = new CanvasManager(canvasEl, cursors, ws, {});
    cm.setColor(userColor);
    cm.setWidth(Number(document.getElementById('width').value || 4));
    cm.setTool(document.getElementById('toolSelect').value || 'brush');
    cm.bindUserInput(userId);

    // store instance
    instances[id] = { id, ws, cm, tabEl: tab, wrapperEl: wrapper, title: title || id };

    // event wiring for this instance's websocket
    ws.on('open', () => {
      ws.send('join', { roomId: id, userId, color: userColor, name: userName });
      ws.send('request_state', {});
    });

    ws.on('init_state', (payload) => {
      cm.fullRepaint(payload.strokes || []);
      window._usersMeta = window._usersMeta || {};
      for (const u of (payload.users || [])) {
        window._usersMeta[u.userId] = { color: u.color, name: u.name || u.userId };
      }
      refreshUsersList();
    });

    ws.on('stroke_started', (payload) => {
      cm.remoteStrokes.set(payload.strokeId, {
        id: payload.strokeId,
        points: [],
        color: payload.color,
        width: payload.width,
        tool: payload.tool,
        userId: payload.userId
      });
      if (payload.userId === userId) {
        cm.current.strokeId = payload.strokeId;
        if (cm.current.buffer && cm.current.buffer.length) {
          for (const p of cm.current.buffer) {
            ws.send('stroke_point', { strokeId: cm.current.strokeId, x: p.x, y: p.y });
            cm.renderPoint(cm.current.strokeId, { x: p.x, y: p.y });
          }
          cm.current.buffer = [];
        }
      }
    });

    ws.on('stroke_point', (payload) => {
      cm.renderPoint(payload.strokeId, { x: payload.x, y: payload.y });
    });

    ws.on('stroke_end', (payload) => {
      if (payload.stroke) cm.renderStroke(payload.stroke);
      else {
        const s = cm.remoteStrokes.get(payload.strokeId);
        if (s) cm.renderStroke(s);
      }
    });

    ws.on('cursor', (payload) => {
      const userMeta = (window._usersMeta && window._usersMeta[payload.userId]) || {};
      cm.updateCursor(payload.userId, payload.x, payload.y, userMeta.color || '#000');
      cm._cursorTimers = cm._cursorTimers || {};
      if (cm._cursorTimers[payload.userId]) clearTimeout(cm._cursorTimers[payload.userId]);
      cm._cursorTimers[payload.userId] = setTimeout(() => cm.removeCursor(payload.userId), 2500);
    });

    ws.on('user_joined', (payload) => {
      window._usersMeta = window._usersMeta || {};
      window._usersMeta[payload.userId] = { color: payload.color, name: payload.name || payload.userId };
      refreshUsersList();
    });

    ws.on('user_left', (payload) => {
      if (window._usersMeta) delete window._usersMeta[payload.userId];
      cm.removeCursor(payload.userId);
      refreshUsersList();
    });

    ws.on('undo', () => ws.send('request_state', {}));
    ws.on('redo', () => ws.send('request_state', {}));

    // Tab click behavior
    tab.addEventListener('click', (e) => {
      if (e.target === close) closeCanvas(id);
      else activateCanvas(id);
    });

    if (activate) activateCanvas(id);
    canvasCount++;
    return instances[id];
  }

  function activateCanvas(roomId) {
    for (const k in instances) {
      const inst = instances[k];
      inst.tabEl.classList.toggle('active', k === roomId);
      inst.wrapperEl.classList.toggle('active', k === roomId);
    }
    activeRoomId = roomId;
    const inst = instances[roomId];
    roomLabel.textContent = inst && inst.title ? `Room: ${inst.title}` : ('Room: ' + roomId);
    // update URL to the active room slug for sharing
    history.replaceState(null, '', '?room=' + roomId);
  }

  function closeCanvas(roomId) {
    const inst = instances[roomId];
    if (!inst) return;
    try { inst.ws.send('leave', { roomId }); } catch (e) {}
    try { inst.ws.close(); } catch (e) {}
    inst.tabEl.remove();
    inst.wrapperEl.remove();
    delete instances[roomId];
    const keys = Object.keys(instances);
    if (keys.length) activateCanvas(keys[0]);
    else activeRoomId = null;
  }

  // Initialize UI
  if (initialRoomFromURL) {
    // If URL contains a room slug, create canvas with that slug as id and use the slug as title.
    createCanvas(initialRoomFromURL, initialRoomFromURL, true);
  } else {
    createCanvas(null, 'Sketch 1', true);
  }

  // New canvas button -> prompt for name
  newCanvasBtn.addEventListener('click', () => {
    const raw = prompt('Enter a name for the new canvas (e.g. "Project Draft"):', `Sketch ${Object.keys(instances).length + 1}`);
    if (!raw) return; // canceled
    const name = raw.trim();
    if (!name) return;
    let slug = slugify(name);
    if (!slug) slug = 'room-' + Math.random().toString(36).slice(2, 7);
    slug = uniqueSlug(slug);
    // create canvas using slug as roomId and original name as title
    const inst = createCanvas(slug, name, true);
    // update browser URL to the active room
    history.replaceState(null, '', '?room=' + inst.id);
  });

  // Toolbar bindings
  const colorPicker = document.getElementById('colorPicker');
  colorPicker.value = userColor;
  colorPicker.addEventListener('input', (e) => {
    const c = e.target.value;
    localStorage.setItem('collab_color', c);
    userColor = c;
    const inst = getActiveInstance();
    if (inst) inst.cm.setColor(c);
  });

  document.getElementById('width').addEventListener('input', (e) => {
    const w = Number(e.target.value);
    const inst = getActiveInstance();
    if (inst) inst.cm.setWidth(w);
  });

  document.getElementById('toolSelect').addEventListener('change', (e) => {
    const t = e.target.value;
    const inst = getActiveInstance();
    if (inst) inst.cm.setTool(t);
  });

  document.getElementById('undo').addEventListener('click', () => {
    const inst = getActiveInstance();
    if (inst) inst.ws.send('undo', { userScoped: true });
  });

  document.getElementById('redo').addEventListener('click', () => {
    const inst = getActiveInstance();
    if (inst) inst.ws.send('redo', {});
  });

  function getActiveInstance() {
    return activeRoomId ? instances[activeRoomId] : null;
  }

  function refreshUsersList() {
    const list = document.getElementById('usersList');
    list.innerHTML = '';
    const meta = window._usersMeta || {};
    for (const id in meta) {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.borderRadius = '50%';
      dot.style.display = 'inline-block';
      dot.style.marginRight = '8px';
      dot.style.background = meta[id].color || '#000';
      li.appendChild(dot);
      const txt = document.createElement('span');
      txt.textContent = meta[id].name || id.slice(0, 6);
      li.appendChild(txt);
      list.appendChild(li);
    }
  }

  // Heartbeat for active instance
  setInterval(() => {
    const inst = getActiveInstance();
    if (inst) {
      try { inst.ws.send('cursor', { x: 10, y: 10 }); } catch (e) {}
    }
  }, 15000);

  // small helper (already defined earlier)
  function randomColor() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h} 70% 30%)`;
  }

})();
