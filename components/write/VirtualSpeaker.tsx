"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { Play, Pause, SkipForward, Music, Search, Loader2, Plus, Volume2, ListMusic, Minimize2 } from 'lucide-react';
import { IMusicQueueItem, IMusicState } from '@/types/write';
import * as Y from 'yjs';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

interface VirtualSpeakerProps {
  musicQueue: Y.Array<IMusicQueueItem>;
  musicState: Y.Map<any>;
  currentUserId: string;
  currentUserName: string;
}

const PLAYER_CONFIG = {
  youtube: {
    playerVars: { 
      controls: 1, 
      modestbranding: 1,
      rel: 0,
      autoplay: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : ''
    }
  }
};

const VirtualSpeaker = React.memo(function VirtualSpeaker(props: VirtualSpeakerProps) {
  // console.log("Rendering VirtualSpeaker...");
  const { musicQueue, musicState, currentUserId, currentUserName } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Local state synced with Yjs
  const [queue, setQueue] = useState<IMusicQueueItem[]>([]);
  const [state, setState] = useState<IMusicState>({
    isPlaying: false,
    currentVideoId: '',
    startedAt: 0,
    currentIndex: 0
  });
  
  // Use a stable ref for the player
  const [hasInteracted, setHasInteracted] = useState(false);

  // Sync Yjs to Local State - optimized with stable objects
  useEffect(() => {
    const sync = () => {
      const currentQueue = musicQueue.toArray();
      setQueue(currentQueue);
      
      setState({
        isPlaying: musicState.get('isPlaying') || false,
        currentVideoId: musicState.get('currentVideoId') || '',
        startedAt: musicState.get('startedAt') || 0,
        currentIndex: musicState.get('currentIndex') || 0
      });
    };

    musicQueue.observe(sync);
    musicState.observe(sync);
    sync();

    return () => {
      musicQueue.unobserve(sync);
      musicState.unobserve(sync);
    };
  }, [musicQueue, musicState]);

  // Listener interaksi yang lebih luas
  useEffect(() => {
    const handleInteract = () => {
      console.log("User interacted - enabling audio");
      setHasInteracted(true);
    };
    window.addEventListener('mousedown', handleInteract, { once: true });
    window.addEventListener('keydown', handleInteract, { once: true });
    window.addEventListener('touchstart', handleInteract, { once: true });
    return () => {
      window.removeEventListener('mousedown', handleInteract);
      window.removeEventListener('keydown', handleInteract);
      window.removeEventListener('touchstart', handleInteract);
    };
  }, []);

  const currentItem = queue[state.currentIndex];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/write/music/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQueue = (video: any) => {
    const newItem: IMusicQueueItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      videoId: video.videoId,
      title: video.title,
      channel: video.channel,
      thumbnail: video.thumbnail,
      durationString: video.durationString,
      addedBy: currentUserName,
      addedById: currentUserId
    };
    
    musicQueue.push([newItem]);
    setSearchResults([]);
    setSearchQuery('');
    
    if (queue.length === 0 && !state.isPlaying) {
      musicState.set('currentVideoId', video.videoId);
      musicState.set('currentIndex', 0);
      musicState.set('isPlaying', true);
      musicState.set('startedAt', Date.now());
    }
  };

  const togglePlay = () => {
    if (queue.length === 0) return;
    const isPlaying = !state.isPlaying;
    musicState.set('isPlaying', isPlaying);
    if (isPlaying && state.startedAt === 0) {
      musicState.set('startedAt', Date.now());
    }
  };

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = state.currentIndex + 1;
    if (nextIndex < queue.length) {
      const nextItem = queue[nextIndex];
      musicState.set('currentIndex', nextIndex);
      musicState.set('currentVideoId', nextItem.videoId);
      musicState.set('isPlaying', true);
      musicState.set('startedAt', Date.now());
    } else {
      musicState.set('isPlaying', false);
      musicState.set('startedAt', 0);
    }
  }, [queue, state.currentIndex, musicState]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="fixed bottom-6 left-6 z-[200] flex flex-col items-start select-none font-sans">
        
        {/* PERSISTENT PLAYER - Never unmounts to keep audio playing */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 mb-2 h-[180px]' : 'opacity-0 h-0 w-0'}`}
          style={{ width: isOpen ? '320px' : '0px' }}
        >
          {state.currentVideoId && (
            <div className="w-full h-full bg-black relative rounded-t-[20px] overflow-hidden border-x border-t border-gray-200">
              <ReactPlayer
                key="persistent-player-instance"
                url={`https://www.youtube.com/watch?v=${state.currentVideoId}`}
                playing={state.isPlaying && hasInteracted}
                onEnded={handleNext}
                volume={0.8}
                width="100%"
                height="100%"
                config={PLAYER_CONFIG}
                style={{ pointerEvents: 'auto' }}
              />
              {!hasInteracted && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                  <Music size={24} className="text-white mb-2 animate-bounce" />
                  <p className="text-white text-[11px] font-bold leading-tight uppercase font-sans tracking-widest">Ketuk Layar Untuk Musik</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Expanded Panel */}
        {isOpen && (
          <div className="bg-white border-x border-b border-gray-200 rounded-b-[20px] shadow-2xl w-[320px] mb-3 overflow-hidden animate-in slide-in-from-bottom-2 flex flex-col max-h-[400px]">
            {/* Header */}
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music size={14} className="text-write-blue" />
                <span className="text-[12px] font-bold text-write-text tracking-wide uppercase">Virtual Speaker</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-write-text3 hover:text-write-text p-1 transition-colors">
                <Minimize2 size={16} />
              </button>
            </div>
            
            {/* Controls */}
            <div className="py-4 px-4 bg-white flex items-center justify-center gap-6 border-b border-write-border">
              <button 
                onClick={togglePlay}
                disabled={queue.length === 0}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 disabled:opacity-30 ${state.isPlaying ? 'bg-write-blue text-white' : 'bg-gray-100 text-write-text'}`}
              >
                {state.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
              </button>
              <button 
                onClick={handleNext}
                disabled={queue.length === 0 || state.currentIndex >= queue.length - 1}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 text-write-text active:scale-90 transition-all disabled:opacity-30"
              >
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30 relative">
              <div className="p-3 border-b border-write-border bg-white sticky top-0 z-10">
                <form onSubmit={handleSearch} className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={14} /></div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Apa yang ingin didengar?"
                    className="w-full pl-9 pr-3 py-2 text-[12px] bg-gray-50 border border-gray-200 focus:border-write-orange rounded-xl outline-none transition-all"
                  />
                </form>
              </div>

              <div className="flex-1 overflow-y-auto p-3 scrollbar-hide" data-lenis-prevent="true">
                {searchResults.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">HASIL PENCARIAN</span>
                      <button onClick={() => setSearchResults([])} className="text-[10px] text-write-orange font-bold">BATAL</button>
                    </div>
                    {searchResults.map((video, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => handleAddToQueue(video)}
                        className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-xl hover:border-write-orange/50 transition-all text-left group"
                      >
                        <img src={video.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-write-text truncate leading-tight group-hover:text-write-orange transition-colors">{video.title}</div>
                          <div className="text-[9px] text-gray-400 truncate mt-0.5">{video.channel} • {video.durationString}</div>
                        </div>
                        <Plus size={14} className="text-write-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-1">ANTREAN BERJALAN</span>
                    {queue.length === 0 ? (
                      <div className="py-8 flex flex-col items-center text-center opacity-40">
                        <Music size={24} className="mb-2" />
                        <p className="text-[11px] font-medium px-4">Cari lagu di atas untuk mulai berkolaborasi</p>
                      </div>
                    ) : (
                      queue.map((item, idx) => (
                        <div key={item.id} className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${idx === state.currentIndex ? 'bg-write-blue/5 border-write-blue/20' : 'bg-white border-gray-100'}`}>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === state.currentIndex ? 'bg-write-blue text-white' : 'bg-gray-50 text-gray-400'}`}>
                            {idx === state.currentIndex ? <Volume2 size={12} /> : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-[11px] truncate leading-tight ${idx === state.currentIndex ? 'text-write-blue font-bold' : 'text-write-text font-medium'}`}>{item.title}</div>
                            <div className="text-[9px] text-gray-400 truncate mt-0.5">Disumbangkan oleh {item.addedBy}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {isSearching && (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <Loader2 size={24} className="text-write-orange animate-spin" />
                    <span className="text-[10px] font-bold text-write-orange animate-pulse">MEMINDAI YOUTUBE...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center gap-3 px-5 h-12 rounded-full shadow-xl hover:shadow-2xl transition-all active:scale-95 border
            ${isOpen ? 'bg-white text-write-text border-gray-200' : state.isPlaying ? 'bg-write-blue text-white border-write-blue/50' : 'bg-white text-write-text border-gray-200'}
          `}
        >
          {state.isPlaying && !isOpen ? (
             <>
               <div className="flex items-center gap-1 justify-center">
                  <div className="w-1 h-3 bg-current rounded-full animate-[bounce_1s_infinite_0s]"></div>
                  <div className="w-1 h-5 bg-current rounded-full animate-[bounce_1s_infinite_0.1s]"></div>
                  <div className="w-1 h-3 bg-current rounded-full animate-[bounce_1s_infinite_0.2s]"></div>
               </div>
               <span className="max-w-[120px] truncate text-[11px] font-bold tracking-tight">{currentItem?.title}</span>
             </>
          ) : (
            <><Music size={18} className="text-write-blue group-hover:rotate-12 transition-transform" /> <span className="font-bold tracking-tight text-[13px]">SPEAKER</span></>
          )}
        </button>
      </div>
    </>,
    document.body
  );
});

export default VirtualSpeaker;
