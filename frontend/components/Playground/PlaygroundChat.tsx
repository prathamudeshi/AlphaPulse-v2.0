"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PlaygroundChatProps {
  results: any;
  strategy: string;
  params: any;
}

const PlaygroundChat: React.FC<PlaygroundChatProps> = ({ results, strategy, params }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! Run a backtest, then ask me anything about the results. I can explain why you made (or lost) money!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Prepare history for backend (exclude initial greeting if needed, but keeping it is fine)
      // We send the FULL history so the backend can reconstruct context
      const historyToSend = [...messages, userMsg].filter(m => m.content !== 'Hi! Run a backtest, then ask me anything about the results. I can explain why you made (or lost) money!');

      const response = await axios.post('http://localhost:8000/api/analyze_playground/', {
        results,
        config: { strategy, params },
        messages: historyToSend
      });

      const aiMsg: Message = { role: 'assistant', content: response.data.analysis };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = { role: 'assistant', content: 'Sorry, I encountered an error analyzing the data.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden" id="tutorial-playground-chat">
      <div className="p-4 border-b border-border bg-surface-hover">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <Bot size={20} className="text-primary" />
          AI Assistant
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${
              msg.role === 'user' 
                ? 'bg-primary text-background' 
                : 'bg-input text-text-primary border border-border'
            }`}>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-input text-text-secondary rounded-lg p-3 border border-border">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-surface">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about your strategy..."
            className="flex-1 bg-input text-text-primary rounded-full px-4 py-2 border border-border focus:outline-none focus:border-primary"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-primary hover:bg-primary-hover text-background p-2 rounded-full transition-colors disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundChat;
