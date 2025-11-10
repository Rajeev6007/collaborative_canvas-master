// client/websocket.js
// Exposes a trivial wrapper for managing WS connection and message send/receive

(function (global) {
  function WSClient(url) {
    this.url = url;
    this.socket = null;
    this.handlers = {};
  }

  WSClient.prototype.connect = function () {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', () => {
      console.log('ws open');
      this._emitLocal('open');
    });
    this.socket.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this._dispatch(msg);
      } catch (e) {
        console.error('bad ws message', ev.data);
      }
    });
    this.socket.addEventListener('close', () => {
      console.log('ws closed');
      this._emitLocal('close');
      // try reconnect
      setTimeout(() => this.connect(), 1500);
    });
    this.socket.addEventListener('error', (e) => {
      console.warn('ws error', e);
    });
  };

  WSClient.prototype.on = function (type, cb) {
    (this.handlers[type] = this.handlers[type] || []).push(cb);
  };

  WSClient.prototype._dispatch = function (msg) {
    const list = this.handlers[msg.type] || [];
    for (const cb of list) cb(msg.payload);
  };

  WSClient.prototype._emitLocal = function (type, payload) {
    const list = this.handlers[type] || [];
    for (const cb of list) cb(payload);
  };

  WSClient.prototype.send = function (type, payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type, payload }));
  };

  global.WSClient = WSClient;
})(window);
