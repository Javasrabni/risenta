'use client';

import { useState, useRef, useEffect } from 'react';
import { TokenUsage, ITodo, IChat, Citation } from '@/types/write';
import { CheckSquare, MessageSquare, Quote, Brain, Send, Plus, Trash2, Import } from 'lucide-react';
import { formatNumber } from '@/lib/writeUtils';

interface WriteLeftPanelProps {
  tokenUsage?: TokenUsage;
  todos: ITodo[];
  chats: IChat[];
  citations: Citation[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string, isDone: boolean) => void;
  onDeleteTodo: (id: string) => void;
  onSendChat: (text: string) => void;
  onDeleteChat?: (id: string) => void;
  onAddCitation: (citation: Omit<Citation, 'id' | 'number'>) => void;
  onDeleteCitation: (id: string) => void;
  onInsertCitation: (citation: Citation) => void;
  currentUserId?: string;
}

type TabType = 'ai' | 'todo' | 'citations' | 'chat';

export default function WriteLeftPanel({
  tokenUsage,
  todos,
  chats,
  citations,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onSendChat,
  onDeleteChat,
  onAddCitation,
  onDeleteCitation,
  onInsertCitation,
  currentUserId
}: WriteLeftPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [chatInput, setChatInput] = useState('');
  const [todoInput, setTodoInput] = useState('');
  
  // Citation states
  const [showAddCitation, setShowAddCitation] = useState(false);
  const [citationForm, setCitationForm] = useState({
    title: '', authors: '', year: '', source: '', url: ''
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Unread & Notification States
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const prevChatsLength = useRef(chats.length);

  // AudioContext singleton reference
  const audioCtxRef = useRef<any>(null);

  const playNotificationSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      
      // Resume if suspended (browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.1); // D6 pop
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch(e) { /* ignore */ }
  };

  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chats, activeTab]);

  useEffect(() => {
    if (chats.length > prevChatsLength.current) {
      const lastMessage = chats[chats.length - 1];
      if (lastMessage.senderId !== currentUserId) {
         playNotificationSound();
         if (activeTab !== 'chat') {
            setHasUnreadChat(true);
         }
      }
    }
    prevChatsLength.current = chats.length;
  }, [chats, currentUserId, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      setHasUnreadChat(false);
    }
  }, [activeTab]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoInput.trim()) return;
    onAddTodo(todoInput.trim());
    setTodoInput('');
  };

  const handleAddCitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citationForm.title || !citationForm.authors || !citationForm.year || !citationForm.source) return;
    onAddCitation({
      title: citationForm.title,
      authors: citationForm.authors,
      year: parseInt(citationForm.year) || new Date().getFullYear(),
      source: citationForm.source,
      text: `${citationForm.authors} (${citationForm.year}). ${citationForm.title}. ${citationForm.source}.`, // Fallback APA string
    });
    setCitationForm({ title: '', authors: '', year: '', source: '', url: '' });
    setShowAddCitation(false);
  };

  return (
    <div className="w-[280px] min-w-[280px] bg-write-bg border-r border-write-border flex flex-col h-full overflow-hidden select-none">
      
      {/* Tabs Header */}
      <div className="flex border-b border-write-border bg-write-bg shrink-0">
        <button 
          className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'ai' ? 'border-write-orange text-write-orange bg-write-orange/5' : 'border-transparent text-write-text3 hover:bg-write-bg2'}`}
          onClick={() => setActiveTab('ai')} title="AI Usage"
        >
          <Brain size={16} />
        </button>
        <button 
          className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'todo' ? 'border-write-orange text-write-orange bg-write-orange/5' : 'border-transparent text-write-text3 hover:bg-write-bg2'}`}
          onClick={() => setActiveTab('todo')} title="To-Do List"
        >
          <CheckSquare size={16} />
        </button>
        <button 
          className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'citations' ? 'border-write-orange text-write-orange bg-write-orange/5' : 'border-transparent text-write-text3 hover:bg-write-bg2'}`}
          onClick={() => setActiveTab('citations')} title="Sitasi / Referensi"
        >
          <Quote size={16} />
        </button>
        <button 
          className={`relative flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'chat' ? 'border-write-orange text-write-orange bg-write-orange/5' : 'border-transparent text-write-text3 hover:bg-write-bg2'}`}
          onClick={() => setActiveTab('chat')} title="Obrolan Kolaborasi"
        >
          <MessageSquare size={16} />
          {hasUnreadChat && (
            <div className="absolute top-2.5 right-6 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 overflow-y-auto bg-write-bg2 relative scrollbar-thin scrollbar-thumb-write-border flex flex-col"
        data-lenis-prevent="true"
      >
        
        {/* --- AI USAGE TAB --- */}
        {activeTab === 'ai' && (
          <div className="p-5 flex flex-col gap-5 animate-in fade-in duration-200">
            <div className="text-[10px] uppercase font-bold text-write-text3 tracking-wider">Penggunaan AI</div>
            
            {tokenUsage ? (
              <div className="flex flex-col gap-4">
                <div className="bg-write-bg p-4 rounded-write-lg border border-write-border text-center shadow-sm">
                  <div className="w-10 h-10 bg-write-blue/10 text-write-blue rounded-full flex items-center justify-center mx-auto mb-3">
                    <Brain size={20} />
                  </div>
                  <div className="text-[13px] font-bold text-write-text mb-1">Paket {tokenUsage.planName}</div>
                  <div className="text-[11px] text-write-text3">Status langganan aktif</div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-write-text">
                    <span>Kuota Prompt (Command)</span>
                    <span className="font-bold text-write-blue">
                      {tokenUsage.promptTotal === -1 ? 'Unlimited' : `${formatNumber(tokenUsage.promptRemaining)} / ${formatNumber(tokenUsage.promptTotal)}`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-write-border rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-write-blue" 
                      style={{ width: tokenUsage.promptTotal === -1 ? '100%' : `${(tokenUsage.promptRemaining / tokenUsage.promptTotal) * 100}%` }} 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex justify-between text-[11px] font-medium text-write-text">
                    <span>Kuota Auto-Generate</span>
                    <span className="font-bold text-write-orange">
                      {tokenUsage.autoGenerateTotal === -1 ? 'Unlimited' : `${formatNumber(tokenUsage.autoGenerateRemaining)} / ${formatNumber(tokenUsage.autoGenerateTotal)}`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-write-border rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-write-orange" 
                      style={{ width: tokenUsage.autoGenerateTotal === -1 ? '100%' : `${(tokenUsage.autoGenerateRemaining / tokenUsage.autoGenerateTotal) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-[12px] text-write-text3 italic">Memuat data penggunaan...</div>
            )}
          </div>
        )}

        {/* --- TO-DO TAB --- */}
        {activeTab === 'todo' && (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            <div className="p-4 border-b border-write-border bg-write-bg shrink-0">
              <form onSubmit={handleAddTodo} className="relative">
                <input 
                  type="text" 
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  placeholder="Tambah tugas baru..." 
                  className="w-full pl-3 pr-8 py-2 text-[12px] bg-write-bg2 border border-write-border focus:border-write-orange rounded-write outline-none"
                />
                <button type="submit" disabled={!todoInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-write-orange disabled:opacity-30 disabled:text-write-text3">
                  <Plus size={14} />
                </button>
              </form>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {todos.length === 0 ? (
                <div className="text-center text-[11px] text-write-text3 italic mt-4">Belum ada tugas kolaborasi.</div>
              ) : (
                todos.map(todo => (
                  <div key={todo.id} className={`flex items-start gap-2.5 p-2.5 rounded-write border transition-colors ${todo.isDone ? 'bg-write-bg border-write-border opacity-60' : 'bg-write-bg border-write-orange/20 shadow-sm'}`}>
                    <input 
                      type="checkbox" 
                      checked={todo.isDone} 
                      onChange={(e) => onToggleTodo(todo.id, e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 accent-write-orange cursor-pointer shrink-0" 
                    />
                    <span className={`text-[12px] flex-1 break-words leading-relaxed ${todo.isDone ? 'line-through text-write-text3' : 'text-write-text font-medium'}`}>
                      {todo.text}
                    </span>
                    <button onClick={() => onDeleteTodo(todo.id)} className="text-write-text3 hover:text-write-red shrink-0" title="Hapus">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- CITATIONS TAB --- */}
        {activeTab === 'citations' && (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            {showAddCitation ? (
              <div className="p-4 bg-write-bg flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[12px] font-bold text-write-text m-0">Tambah Sitasi M-Style</h4>
                  <button onClick={() => setShowAddCitation(false)} className="text-[11px] text-write-text3 hover:text-write-text">Batal</button>
                </div>
                <form onSubmit={handleAddCitation} className="flex flex-col gap-3">
                  <input type="text" placeholder="Judul Buku/Artikel" required value={citationForm.title} onChange={e => setCitationForm({...citationForm, title: e.target.value})} className="w-full px-3 py-2 text-[12px] bg-write-bg2 border border-write-border focus:border-write-orange rounded-write outline-none" />
                  <input type="text" placeholder="Penulis (contoh: John Doe)" required value={citationForm.authors} onChange={e => setCitationForm({...citationForm, authors: e.target.value})} className="w-full px-3 py-2 text-[12px] bg-write-bg2 border border-write-border focus:border-write-orange rounded-write outline-none" />
                  <input type="number" placeholder="Tahun Terbit" required value={citationForm.year} onChange={e => setCitationForm({...citationForm, year: e.target.value})} className="w-full px-3 py-2 text-[12px] bg-write-bg2 border border-write-border focus:border-write-orange rounded-write outline-none" />
                  <input type="text" placeholder="Sumber/Jurnal/Penerbit" required value={citationForm.source} onChange={e => setCitationForm({...citationForm, source: e.target.value})} className="w-full px-3 py-2 text-[12px] bg-write-bg2 border border-write-border focus:border-write-orange rounded-write outline-none" />
                  <button type="submit" className="mt-2 w-full bg-write-orange hover:bg-write-orange/90 text-white font-bold text-[12px] py-2 rounded-write">Simpan Sitasi</button>
                </form>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-write-border bg-write-bg shrink-0 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-write-text3">Daftar Referensi</span>
                  <button onClick={() => setShowAddCitation(true)} className="flex items-center gap-1 text-[10px] font-bold text-write-orange hover:text-write-orange/80 bg-write-orange/10 px-2 py-1 rounded-full">
                    <Plus size={10} /> Tambah
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {citations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                      <Quote size={24} />
                      <div className="text-[11px] text-center px-4">Kumpulkan daftar sitasi / referensi Anda di sini untuk disisipkan ke editor.</div>
                    </div>
                  ) : (
                    citations.map((cit, idx) => (
                      <div key={cit.id} className="bg-write-bg border border-write-border rounded-write p-3 shadow-sm hover:border-write-blue/40 transition-colors group">
                        <div className="flex items-start justify-between mb-1.5 gap-2">
                          <span className="text-[10px] font-bold bg-write-bg2 px-1.5 rounded text-write-text2 shrink-0">[{idx + 1}]</span>
                          <span className="text-[11px] font-bold text-write-text leading-tight flex-1 line-clamp-2" title={cit.title}>{cit.title}</span>
                          <button onClick={() => onDeleteCitation(cit.id)} className="text-write-text3 hover:text-write-red opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="text-[10px] text-write-text3 leading-relaxed line-clamp-2 pl-[22px] mb-2">
                          {cit.authors} ({cit.year}). {cit.source}.
                        </div>
                        <div className="pl-[22px]">
                          <button 
                            onClick={() => onInsertCitation({...cit, number: idx + 1})}
                            className="bg-write-blue/10 text-write-blue hover:bg-write-blue hover:text-white transition-colors text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1.5 w-max"
                          >
                            <Import size={10} /> Sisipkan inline [{idx + 1}]
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full animate-in fade-in duration-200">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#f8f9fa] dark:bg-write-bg2">
              {chats.length === 0 ? (
                <div className="text-center text-[11px] text-write-text3 italic mt-auto mb-auto">Mulai obrolan kolaborasi...</div>
              ) : (
                chats.map((msg, i) => {
                  const isMe = msg.senderId === currentUserId;
                  const showName = !isMe && (i === 0 || chats[i-1].senderId !== msg.senderId);
                  
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      {showName && <span className="text-[9px] text-write-text3 mb-0.5 ml-1">{msg.senderName}</span>}
                      
                      <div className="flex items-center gap-1.5 group">
                        {isMe && !msg.isDeleted && onDeleteChat && (
                          <button onClick={() => onDeleteChat(msg.id)} className="text-write-red opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Hapus pesan"><Trash2 size={12} /></button>
                        )}
                        <div 
                          className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed break-words shadow-sm
                          ${msg.isDeleted 
                            ? 'bg-write-bg2 border border-write-border text-write-text3 italic dark:bg-write-bg dark:border-write-border' 
                            : (isMe 
                              ? 'bg-write-blue text-white rounded-br-sm' 
                              : 'bg-white border border-write-border text-write-text rounded-bl-sm dark:bg-write-bg dark:border-write-border')}`}
                        >
                          {msg.text}
                        </div>
                      </div>

                      <span className="text-[8px] text-write-text3 mt-0.5 mx-1 opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-3 border-t border-write-border bg-write-bg shrink-0">
              <form onSubmit={handleSendChat} className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ketik pesan..." 
                  className="flex-1 bg-write-bg2 border border-write-border text-[12px] text-write-text rounded-full px-3.5 py-2 outline-none focus:border-write-blue"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim()}
                  className="w-8 h-8 rounded-full bg-write-blue text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-write-text3 transition-colors hover:bg-write-blue/90"
                >
                  <Send size={12} className="-ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
