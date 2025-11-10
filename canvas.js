// client/canvas.js
// Handles canvas drawing, remote stroke rendering, local stroke capture

(function (global) {
  function CanvasManager(canvasEl, cursorsContainer, wsClient, opts = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.ws = wsClient;
    this.cursorsContainer = cursorsContainer;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.current = { drawing: false, strokeId: null };
    this.tool = 'brush';
    this.color = '#000';
    this.width = 4;

    this.remoteStrokes = new Map(); // strokeId -> stroke data (for live streaming)
    this.strokesRendered = new Set(); // ids already rendered into the "final" canvas
  }

  CanvasManager.prototype.resize = function () {
    const w = this.canvas.clientWidth || this.canvas.width;
    const h = this.canvas.clientHeight || this.canvas.height;
    this.canvas.width = w * this.pixelRatio;
    this.canvas.height = h * this.pixelRatio;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    // re-render from server strokes after resize: request state refresh
    if (this.ws) this.ws.send('request_state', {});
  };

  CanvasManager.prototype.setTool = function (t) { this.tool = t; };
  CanvasManager.prototype.setColor = function (c) { this.color = c; };
  CanvasManager.prototype.setWidth = function (w) { this.width = w; };

  CanvasManager.prototype._drawSegment = function (ctx, pts, style) {
    if (!pts || pts.length < 2) return;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = style.width;
    if (style.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = style.color;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
    ctx.closePath();
    ctx.globalCompositeOperation = 'source-over';
  };

  // render full stroke (final)
  CanvasManager.prototype.renderStroke = function (stroke) {
    if (!stroke || !stroke.points || stroke.points.length === 0) return;
    this._drawSegment(this.ctx, stroke.points, { color: stroke.color, width: stroke.width, tool: stroke.tool });
    this.strokesRendered.add(stroke.id);
    // remove from remoteStrokes if present
    this.remoteStrokes.delete(stroke.id);
  };

  // incremental: draw live points onto overlay canvas (we draw directly to main for simplicity, but keep remoteStrokes to re-render on reconnect)
  CanvasManager.prototype.renderPoint = function (strokeId, point) {
    let stroke = this.remoteStrokes.get(strokeId);
    if (!stroke) {
      // create placeholder style; server should have sent stroke_started earlier
      stroke = { id: strokeId, points: [], color: this.color, width: this.width, tool: 'brush' };
      this.remoteStrokes.set(strokeId, stroke);
    }
    stroke.points.push([point.x, point.y]);
    // draw only the last segment
    const pts = stroke.points;
    const ctx = this.ctx;
    if (pts.length >= 2) {
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = stroke.width;
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  // clear & re-render all strokes (used when undo/redo modifies full list)
  CanvasManager.prototype.fullRepaint = function (strokes) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width / this.pixelRatio, this.canvas.height / this.pixelRatio);
    this.strokesRendered.clear();
    for (const s of strokes) {
      this.renderStroke(s);
    }
  };

  // user input wiring
  CanvasManager.prototype.bindUserInput = function (userId) {
    const canvas = this.canvas;
    const toLocal = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left);
      const y = (ev.clientY - rect.top);
      return { x, y };
    };

    const pointerDown = (ev) => {
      ev.preventDefault();
      const p = toLocal(ev);
      this.current.drawing = true;
      this.current.startPoint = p;
      // request server to start stroke
      this.ws.send('stroke_start', { color: this.color, width: this.width, tool: this.tool });
      // server will send stroke_started with id; but to keep responsive we generate a temporary id too
      // We'll rely on server-provided id for networked events.
    };

    const pointerMove = (ev) => {
      const p = toLocal(ev);
      // send cursor
      this.ws.send('cursor', { x: p.x, y: p.y });
      if (!this.current.drawing) return;
      // send point to server (client doesn't know stroke id until server sent stroke_started)
      // to avoid waiting, we track lastStrokeId assigned from server to this client
      if (!this.current.strokeId) {
        // nothing yet; we cannot send points yet. HOWEVER server will have started stroke and broadcast stroke_started immediately,
        // which should set current.strokeId in 'stroke_started' handler below. To avoid losing the first few points, we buffer them.
        this.current.buffer = this.current.buffer || [];
        this.current.buffer.push(p);
      } else {
        // send live point
        this.ws.send('stroke_point', { strokeId: this.current.strokeId, x: p.x, y: p.y });
        // also render locally for instant feedback
        this.renderPoint(this.current.strokeId, { x: p.x, y: p.y });
      }
    };

    const pointerUp = (ev) => {
      if (!this.current.drawing) return;
      this.current.drawing = false;
      if (this.current.strokeId) {
        this.ws.send('stroke_end', { strokeId: this.current.strokeId });
      } else {
        // we might have buffered points; they'll be sent once strokeId assigned by server.
      }
      // reset
      this.current.strokeId = null;
      this.current.buffer = [];
    };

    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);

    // handle server telling us stroke_started
    this.ws.on('stroke_started', (payload) => {
      // if this stroke belongs to me, capture id locally so subsequent points are sent with correct id
      if (payload.userId === userId) {
        this.current.strokeId = payload.strokeId;
        // send any buffered points
        if (this.current.buffer && this.current.buffer.length) {
          for (const p of this.current.buffer) {
            this.ws.send('stroke_point', { strokeId: this.current.strokeId, x: p.x, y: p.y });
            this.renderPoint(this.current.strokeId, { x: p.x, y: p.y });
          }
          this.current.buffer = [];
        }
      }
      // create remote placeholder stroke
      this.remoteStrokes.set(payload.strokeId, { id: payload.strokeId, points: [], color: payload.color, width: payload.width, tool: payload.tool });
    });

    // handle stroke_point messages
    this.ws.on('stroke_point', (payload) => {
      this.renderPoint(payload.strokeId, { x: payload.x, y: payload.y });
    });

    this.ws.on('stroke_end', (payload) => {
      // when stroke finishes, move to final rendering if not already
      const s = this.remoteStrokes.get(payload.strokeId);
      if (s) {
        this.renderStroke(s);
      }
    });

    // full-state init
    this.ws.on('init_state', (payload) => {
      this.fullRepaint(payload.strokes || []);
      // also update users list handled elsewhere
    });

    // undo/redo events
    this.ws.on('undo', (payload) => {
      // payload: { strokeId } -> remove stroke with id and full repaint from server's main state
      this.ws.send('request_state', {}); // ask server for authoritative state, or server could include list
      // The 'init_state' will come back — simple approach
    });

    this.ws.on('redo', (payload) => {
      this.ws.send('request_state', {});
    });
  };

  // cursor UI
  CanvasManager.prototype.updateCursor = function (userId, x, y, color) {
    let el = document.querySelector(`.cursor[data-user="${userId}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'cursor';
      el.setAttribute('data-user', userId);
      el.innerHTML = `<div class="dot"></div><div class="name">${userId.slice(0,6)}</div>`;
      this.cursorsContainer.appendChild(el);
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.querySelector('.dot').style.background = color || '#000';
  };

  CanvasManager.prototype.removeCursor = function (userId) {
    const el = document.querySelector(`.cursor[data-user="${userId}"]`);
    if (el) el.remove();
  };

  global.CanvasManager = CanvasManager;
})(window);
