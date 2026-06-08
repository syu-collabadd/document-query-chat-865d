import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, CheckCircle, Clock, TrendingUp, Database, Zap, BookOpen } from 'lucide-react';
import { fetchDocuments } from '../lib/api';
import type { Document } from '../lib/api';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const USE_CASE_EXAMPLES = [
  {
    icon: BookOpen,
    title: 'Document Q&A',
    desc: 'Ask natural language questions and get precise answers sourced from specific documents',
    example: '"What were the key deliverables in the Q3 project plan?"',
    color: 'indigo',
  },
  {
    icon: TrendingUp,
    title: 'Data Extraction',
    desc: 'Pull structured information like dates, names, numbers, and metrics from unstructured text',
    example: '"List all budget figures mentioned in the financial report"',
    color: 'violet',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    desc: 'Route action items, summarize meetings, and generate follow-up tasks automatically',
    example: '"What action items were assigned to the engineering team?"',
    color: 'blue',
  },
];

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  violet: 'bg-violet-50 text-violet-600',
  blue: 'bg-blue-50 text-blue-600',
};

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ready = documents.filter(d => d.status === 'ready');
  const processing = documents.filter(d => d.status === 'processing');
  const totalSize = documents.reduce((sum, d) => sum + d.size, 0);
  const totalChunks = ready.reduce((sum, d) => sum + d.chunkCount, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <h1 className="font-semibold text-gray-900">Knowledge Base</h1>
        <p className="text-xs text-gray-400 mt-0.5">Overview of your indexed documents and AI capabilities</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total documents', value: loading ? '—' : documents.length, icon: FileText, color: 'indigo' },
            { label: 'Indexed & ready', value: loading ? '—' : ready.length, icon: CheckCircle, color: 'emerald' },
            { label: 'Total chunks', value: loading ? '—' : totalChunks, icon: Database, color: 'violet' },
            { label: 'Storage used', value: loading ? '—' : formatSize(totalSize), icon: TrendingUp, color: 'blue' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-${color}-50`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Processing status */}
        {processing.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            <span className="text-sm text-amber-800">
              {processing.length} document{processing.length > 1 ? 's' : ''} being indexed...
            </span>
          </div>
        )}

        {/* Document index */}
        {documents.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-indigo-500" />
              <h2 className="font-medium text-sm text-gray-900">Indexed Documents</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                    <div className="text-xs text-gray-400">
                      {formatSize(doc.size)}
                      {doc.status === 'ready' && ` · ${doc.chunkCount} chunks`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc.status === 'ready' ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs text-emerald-700">Indexed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        <span className="text-xs text-amber-700">Processing</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Use cases */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">What you can ask</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {USE_CASE_EXAMPLES.map(({ icon: Icon, title, desc, example, color }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{desc}</p>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 italic">
                  {example}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty CTA */}
        {documents.length === 0 && !loading && (
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-indigo-400 opacity-60" />
            <h3 className="font-semibold text-gray-900 mb-2">Your knowledge base is empty</h3>
            <p className="text-sm text-gray-500 mb-4">Upload documents to start querying your data with AI</p>
            <a
              href="/documents"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Add your first document
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
