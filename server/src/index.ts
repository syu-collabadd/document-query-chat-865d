import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { chatRouter } from './routes/chat';
import { documentsRouter } from './routes/documents';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);

// Serve client build
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, '::', () => {
  console.log(`Server running on port ${PORT}`);
});
