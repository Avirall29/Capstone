# Backend API - Transport Tracking System

Node.js + Express + MongoDB backend with WebSocket support for real-time location tracking.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/transport_tracking
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
```

3. Start MongoDB (if not running)

4. Create an admin (see `../CREATE_ADMIN.md`):
```bash
node create-admin.js you@example.com "a-strong-password"
```

5. Start server:
```bash
npm run dev
```

## Environment

Set `CORS_ORIGINS` (comma-separated) to the web origins allowed to call the API, e.g. the deployed admin panel URL. Defaults to `http://localhost:3000,http://localhost:3001`.

## API Documentation

See main README.md for complete API endpoint documentation.

