const API_BASE = '/api';

export interface Document {
  id: string;
  name: string;
  fileType: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  chunkCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

function getUserId(): string {
  let id = localStorage.getItem('docquery_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('docquery_user_id', id);
  }
  return id;
}

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: { 'x-user-id': getUserId() },
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  const data = await res.json();
  return data.documents;
}

export async function uploadDocument(file: File): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: { 'x-user-id': getUserId() },
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.document;
}

export async function uploadText(name: string, content: string): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: { 'x-user-id': getUserId(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-id': getUserId() },
  });
  if (!res.ok) throw new Error('Delete failed');
}

export async function getDocumentContext(): Promise<Array<{ name: string; content: string }>> {
  const res = await fetch(`${API_BASE}/documents/context`, {
    headers: { 'x-user-id': getUserId() },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents;
}

export async function* streamChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  documents: Array<{ name: string; content: string }>
): AsyncGenerator<string> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
    body: JSON.stringify({ messages, documents }),
  });

  if (!res.ok) throw new Error('Chat request failed');
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'text') yield data.text;
        if (data.type === 'done') return;
        if (data.type === 'error') throw new Error(data.error);
      } catch {
        // skip malformed lines
      }
    }
  }
}
