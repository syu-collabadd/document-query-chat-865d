import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

export const documentsRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/plain', 'application/pdf', 'text/markdown', 'text/csv', 'application/json'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(txt|md|csv|json)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only text, PDF, markdown, CSV, and JSON files are allowed'));
    }
  },
});

// In-memory store — in production would use Supabase Storage
const documentStore: Map<string, {
  id: string;
  userId: string;
  name: string;
  content: string;
  fileType: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  chunkCount: number;
  createdAt: string;
}> = new Map();

function simulateChunking(content: string): number {
  const avgChunkSize = 500;
  return Math.max(1, Math.ceil(content.length / avgChunkSize));
}

documentsRouter.get('/', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string || 'demo-user';
  const docs = Array.from(documentStore.values())
    .filter(d => d.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ documents: docs });
});

documentsRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const file = req.file;
    const pastedContent = req.body.content;
    const pastedName = req.body.name;

    let content = '';
    let name = '';
    let fileType = 'text/plain';
    let size = 0;

    if (file) {
      content = file.buffer.toString('utf-8');
      name = file.originalname;
      fileType = file.mimetype;
      size = file.size;
    } else if (pastedContent) {
      content = pastedContent;
      name = pastedName || 'Pasted Content';
      fileType = 'text/plain';
      size = Buffer.byteLength(pastedContent, 'utf-8');
    } else {
      res.status(400).json({ error: 'No file or content provided' });
      return;
    }

    const id = uuidv4();
    const doc = {
      id,
      userId,
      name,
      content,
      fileType,
      size,
      status: 'processing' as const,
      chunkCount: 0,
      createdAt: new Date().toISOString(),
    };

    documentStore.set(id, doc);

    // Simulate async processing
    setTimeout(() => {
      const stored = documentStore.get(id);
      if (stored) {
        stored.status = 'ready';
        stored.chunkCount = simulateChunking(content);
        documentStore.set(id, stored);
      }
    }, 2000);

    res.json({ document: { ...doc, content: undefined } });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

documentsRouter.get('/:id/content', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string || 'demo-user';
  const doc = documentStore.get(req.params.id);
  if (!doc || doc.userId !== userId) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({ content: doc.content });
});

documentsRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string || 'demo-user';
  const doc = documentStore.get(req.params.id);
  if (!doc || doc.userId !== userId) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  documentStore.delete(req.params.id);
  res.json({ success: true });
});

documentsRouter.get('/context', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string || 'demo-user';
  const docs = Array.from(documentStore.values())
    .filter(d => d.userId === userId && d.status === 'ready')
    .map(d => ({ name: d.name, content: d.content.slice(0, 4000) }));
  res.json({ documents: docs });
});
