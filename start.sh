#!/bin/bash
set -e

# Install deps if needed
if [ ! -d "server/node_modules" ]; then
  cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
  cd client && npm install && cd ..
fi

# Build client
cd client && npm run build && cd ..

# Start server with tsx (no compile step needed)
cd server && exec npx tsx src/index.ts
