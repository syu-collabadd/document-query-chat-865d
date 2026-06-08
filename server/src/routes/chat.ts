import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

export const chatRouter = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  documents?: Array<{ name: string; content: string }>;
  conversationId?: string;
}

chatRouter.post('/stream', async (req: Request, res: Response) => {
  try {
    const { messages, documents } = req.body as ChatRequest;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'Messages are required' });
      return;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let systemPrompt = `You are DocQuery AI, an intelligent document assistant that helps users extract insights and answer questions from their documents and knowledge base.

You have access to the user's uploaded documents and can answer questions based on their content. Be precise, cite relevant document sections when answering, and clearly indicate when information comes from a specific document.

When no documents are available, acknowledge this and suggest the user upload documents to get started. Be helpful, professional, and concise.`;

    if (documents && documents.length > 0) {
      systemPrompt += '\n\n## Available Documents:\n\n';
      documents.forEach((doc, i) => {
        systemPrompt += `### Document ${i + 1}: ${doc.name}\n${doc.content}\n\n`;
      });
    }

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
    });

    stream.on('message', () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    });

    stream.on('error', (error) => {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`);
      res.end();
    });

    req.on('close', () => {
      stream.abort();
    });
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

chatRouter.post('/suggestions', async (_req: Request, res: Response) => {
  const suggestions = [
    "What are the key findings in my documents?",
    "Summarize the main topics covered across all documents",
    "What action items or next steps are mentioned?",
    "Find any dates, deadlines, or important milestones",
    "What are the most important numbers or metrics mentioned?",
  ];
  res.json({ suggestions });
});
