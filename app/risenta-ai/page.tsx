"use client";

import { useState, useRef, useEffect } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import ReactMarkdown from "react-markdown";

type TaskType = "rewrite" | "expand" | "feedback" | "story" | "formal" | "casual";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  task?: TaskType;
  isError?: boolean;
}

export default function AiWriter() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("airisenta_history");
    const savedUsage = localStorage.getItem("airisenta_usage");
    const disclaimerSeen = localStorage.getItem("airisenta_disclaimer_seen");

    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedUsage) setUsageCount(parseInt(savedUsage));
    if (!disclaimerSeen) setShowDisclaimer(true);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleGenerate = async () => {
    if (usageCount >= 5) { setShowPremiumModal(true); return; }
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input };
    setHistory(prev => [...prev, userMsg]);
    setLoading(true);
    setInput("");

    try {
      const res = await fetch("/api/ai/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: data.output || "Maaf, terjadi kesalahan.",
      };

      const nextUsage = usageCount + 1;
      setUsageCount(nextUsage);
      setHistory(prev => [...prev, aiMsg]);
      localStorage.setItem("airisenta_usage", nextUsage.toString());
      localStorage.setItem("airisenta_history", JSON.stringify([...history, userMsg, aiMsg]));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative antialiased">
      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl transition-all">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-8 rounded-[2.5rem] max-w-md text-center shadow-2xl">
            <h3 className="text-xl font-bold dark:text-white mb-4">Pemberitahuan Beta</h3>
            <p className="text-neutral-500 text-sm leading-relaxed mb-8">
              Airisenta dirancang untuk membantu Anda <b>belajar menulis</b>. Model ini dalam tahap pengembangan dengan kuota <b>5x permintaan gratis</b>, mohon gunakan dengan bijak.
            </p>
            <button
              onClick={() => { localStorage.setItem("airisenta_disclaimer_seen", "true"); setShowDisclaimer(false); }}
              className="w-full py-4 bg-neutral-950 dark:bg-white text-white dark:text-black font-bold rounded-2xl active:scale-95 transition-transform"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[2.5rem] border border-neutral-200/50 dark:border-neutral-800/50 bg-white dark:bg-neutral-950 shadow-2xl">

        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-white/50 dark:bg-black/20 backdrop-blur-md z-20 relative">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tighter dark:text-white">Airisenta</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20 uppercase">Beta</span>
            </div>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
              Quota: {5 - usageCount} / 5 Left
            </p>
          </div>
        </div>

        {/* Chat History Area with Mask Gradient */}
        <div className="relative h-[500px]">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar relative z-10"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              color: 'rgba(120,120,120,0.05)',
              maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
            }}
          >
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600">
                <p className="text-sm font-medium italic">Tuliskan gagasan intelektual Anda...</p>
              </div>
            ) : (
              history.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-5 py-4 rounded-[1.8rem] text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-black rounded-tr-none font-medium"
                      : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none shadow-sm"
                    }`}>
                    <span className="prose dark:prose-invert prose-sm">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </span>
                  </div>
                </div>
              ))
            )}
            {loading && <div className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] animate-pulse">Processing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Soft Gradient Overlay antara Chat dan Input */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-neutral-950 to-transparent z-15 pointer-events-none" />
        </div>

        {/* Input Area */}
        <div className="p-8 pt-2 bg-white dark:bg-neutral-950 relative z-20 pb-30">
          <div className="relative group">
            <textarea
              className="w-full bg-neutral-100 dark:bg-neutral-900/80 border-0 rounded-[2rem] pl-6 pr-16 py-5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none min-h-[64px]"
              rows={1}
              placeholder="Sampaikan pesan Anda..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleGenerate())}
            />
            <button
              onClick={handleGenerate}
              className="absolute right-3 top-3 bottom-3 w-10 h-10 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-lg"
            >
              <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
          {/* <p className="mt-4 text-[9px] text-neutral-400 font-bold uppercase tracking-[0.3em] text-center opacity-50">Powered by Risenta</p> */}
        </div>

        <BorderBeam size={300} duration={15} className="from-transparent via-blue-500/20 to-transparent" />
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in zoom-in-95">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-800 p-10 rounded-[3rem] max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500" />
            <span className="text-4xl block mb-6">💎</span>
            <h3 className="text-2xl font-black dark:text-white mb-2">Limit Tercapai</h3>
            <p className="text-neutral-500 text-sm mb-8">Anda telah menggunakan seluruh kuota belajar gratis hari ini.</p>
            <button onClick={() => window.location.href = '/pricing'} className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl mb-4 hover:opacity-90 transition-all">Upgrade ke Premium</button>
            <button onClick={() => setShowPremiumModal(false)} className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}