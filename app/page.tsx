'use client';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '../componente/Barra';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [chatId, setChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) handleNewChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleNewChat = () => {
    setChatId(Math.random().toString(36).substring(7));
    setMessages([]);
  };

  const handleSelectChat = async (id: string) => {
    setChatId(id);
    setLoading(true);
    try {
      const res = await fetch('/api/historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: id })
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, chatId })
      });
      const data = await res.json();
      
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ocurrió un error en la comunicación.' }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentChatId={chatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
      
      <main className="flex-1 flex flex-col h-screen">
        <header className="bg-white border-b border-slate-200 p-4 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🤖 Agente Experto - Publicaciones IA</h1>
          <p className="text-xs text-slate-500">Consulta de forma inteligente autores, papers e instituciones</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg font-medium">¡Bienvenido al asistente analítico!</p>
              <p className="text-sm">Prueba preguntando: "¿Qué autores publicaron en el área de Computer Vision?"</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl px-4 py-3 rounded-lg shadow-sm text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none leading-relaxed whitespace-pre-line' // ← ¡AGREGA ESTA CLASE AQUÍ!
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-500 px-4 py-3 rounded-lg text-sm rounded-bl-none shadow-sm flex items-center space-x-2">
                <span className="animate-pulse">Pensando y consultando el grafo...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Barra de Entrada de Texto */}
        <footer className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta aquí..."
              disabled={loading}
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:bg-slate-100 transition-shadow shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              Enviar
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}