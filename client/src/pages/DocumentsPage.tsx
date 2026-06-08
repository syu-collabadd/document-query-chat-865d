import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle, Plus, FileUp, X } from 'lucide-react';
import { fetchDocuments, uploadDocument, uploadText, deleteDocument } from '../lib/api';
import type { Document } from '../lib/api';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: Document['status'] }) {
  if (status === 'ready') return (
    <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Ready
    </span>
  );
  if (status === 'processing') return (
    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3 animate-spin" /> Processing
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteName, setPasteName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(loadDocuments, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setUploading(true);
    setError('');
    try {
      for (const file of fileArray) {
        await uploadDocument(file);
      }
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setUploading(true);
    setError('');
    try {
      await uploadText(pasteName || 'Pasted Content', pasteText);
      setShowPasteModal(false);
      setPasteText('');
      setPasteName('');
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch {
      setError('Delete failed');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900">Documents</h1>
          <p className="text-xs text-gray-400 mt-0.5">{documents.length} documents · {documents.filter(d => d.status === 'ready').length} indexed</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Paste text
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-white bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FileUp className="w-4 h-4" /> Upload file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.csv,.json"
            className="hidden"
            onChange={e => e.target.files && handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-6 ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
          }`}
        >
          <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-indigo-500' : 'text-gray-300'}`} />
          <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">TXT, MD, CSV, JSON — max 10MB per file</p>
          {uploading && (
            <p className="text-xs text-indigo-600 mt-2 animate-pulse">Uploading...</p>
          )}
        </div>

        {/* Document list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No documents yet. Upload a file or paste text to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{doc.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatSize(doc.size)}
                    {doc.status === 'ready' && ` · ${doc.chunkCount} chunks`}
                    {' · '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={doc.status} />
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paste modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Paste text content</h3>
              <button onClick={() => setShowPasteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document name</label>
                <input
                  type="text"
                  value={pasteName}
                  onChange={e => setPasteName(e.target.value)}
                  placeholder="e.g. Q4 Report, Meeting Notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste your text content here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none scrollbar-thin"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowPasteModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim() || uploading}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {uploading ? 'Adding...' : 'Add document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
