import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, FileText, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';
import { streamChat, getDocumentContext, fetchDocuments } from '../lib/api';
import type { Message, Document } from '../lib/api';

const DEMO_PROMPTS = [
  "What are the key findings in my documents?",
  "Summarize the main topics covered",
  "What action items or next steps are mentioned?",
  "Find important dates or deadlines",
];

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1 items-center h-5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-indigo-400"
              style={{ animation: `pulseDot 1.4s ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-gray-700' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <div className={`text-xs mt-1.5 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
          {message.createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [apiError, setApiError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    fetchDocuments().then(setDocuments).catch(() => {});
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || streaming) return;

    setInput('');
    setApiError('');
    abortRef.current = false;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setStreaming(true);
    setStreamingContent('');

    try {
      const docContext = await getDocumentContext();
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      let accumulated = '';
      for await (const chunk of streamChat(allMessages, docContext)) {
        if (abortRef.current) break;
        accumulated += chunk;
        setStreamingContent(accumulated);
      }

      if (accumulated) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
          createdAt: new Date(),
        }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('ANTHROPIC_API_KEY')) {
        setApiError('ANTHROPIC_API_KEY not configured on the server. Add it to the .env file.');
      } else {
        setApiError(msg);
      }
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }, [input, streaming, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900">AI Chat</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {documents.length > 0
              ? `${documents.filter(d => d.status === 'ready').length} documents in context`
              : 'No documents — answers are general knowledge'}
          </p>
        </div>
        {documents.length === 0 && (
          <a
            href="/documents"
            className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Add documents
            <ChevronRight className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-5">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-20 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ask anything about your documents</h2>
            <p className="text-gray-500 text-sm max-w-sm mb-8">
              Upload documents first, then ask questions to extract insights, summaries, and specific information.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {DEMO_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streaming && !streamingContent && <TypingIndicator />}

        {streaming && streamingContent && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[75%] bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{streamingContent}</p>
              <div className="flex items-center gap-1 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs text-gray-400">Generating...</span>
              </div>
            </div>
          </div>
        )}

        {apiError && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none max-h-32 scrollbar-thin"
            style={{ minHeight: '22px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
