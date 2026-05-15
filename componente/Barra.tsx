'use client';
import { useEffect, useState } from 'react';

interface Chat {
  id: string;
  title: string;
}

interface SidebarProps {
  currentChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

export default function Sidebar({ currentChatId, onSelectChat, onNewChat }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    fetch('/api/historial')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setChats(data); })
      .catch(err => console.error(err));
  }, [currentChatId]);

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <button 
          onClick={onNewChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          + Nueva conversación
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <h3 className="text-xs font-semibold text-slate-400 px-2 my-2 uppercase tracking-wider">Historial de consultas</h3>
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm truncate transition-colors ${
              currentChatId === chat.id ? 'bg-slate-800 font-medium text-white' : 'text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            {chat.title || 'Conversación vacía'}
          </button>
        ))}
      </div>
    </aside>
  );
}