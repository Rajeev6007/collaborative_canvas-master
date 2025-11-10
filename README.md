# Real-Time Collaborative Drawing Canvas

Vanilla JavaScript + Node.js + WebSocket (server-authoritative canvas state)

## Features
- Brush and eraser tools
- Color picker and stroke width
- Real-time streaming: strokes are broadcast while drawing
- User cursors (shows where other users are)
- Rooms: open `/index.html?room=roomName` or just `/?room=roomName`
- Global undo/redo (server authoritative)
- No frontend frameworks or drawing libraries

## Quickstart (local)
1. Install dependencies:
```bash
npm install
