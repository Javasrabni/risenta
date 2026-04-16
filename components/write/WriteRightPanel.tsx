'use client';

import { useState, useEffect } from 'react';
import { Document, ChiMood } from '@/types/write';
import { calculateStats, formatNumber } from '@/lib/writeUtils';
import CollaborationPanel from './CollaborationPanel';
import { Collaborator, CollaborationSession } from '@/types/collaboration';

interface WriteRightPanelProps {
  activeDoc?: Document;
  chiMood: ChiMood;
  setChiMood: (mood: ChiMood) => void;
  collaborators?: Collaborator[];
  activeUsers?: CollaborationSession[];
  isOwner?: boolean;
  myRole?: string;
  onInviteClick?: () => void;
  onRemoveCollaborator?: (id: string) => void;
}

export default function WriteRightPanel({
  activeDoc,
  chiMood,
  setChiMood,
  collaborators = [],
  activeUsers = [],
  isOwner = false,
  myRole = 'viewer',
  onInviteClick,
  onRemoveCollaborator,
}: WriteRightPanelProps) {
  const [stats, setStats] = useState({
    words: 0,
    chars: 0,
    sentences: 0,
    paragraphs: 0,
    readingTime: 0,
  });
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    if (activeDoc) {
      const newStats = calculateStats(activeDoc.content);
      setStats(newStats);
    }
  }, [activeDoc?.content]);

  const getChiEmoji = () => {
    switch (chiMood.type) {
      case 'thinking':
        return '🤔';
      case 'proud':
        return '😊';
      case 'concerned':
        return '😟';
      case 'happy':
        return '😄';
      case 'sleepy':
        return '😴';
      default:
        return '🙂';
    }
  };

  const getChiAnimation = () => {
    if (chiMood.type === 'thinking') return 'chi-thinking';
    if (chiMood.type === 'proud') return 'chi-bounce';
    if (chiMood.type === 'happy') return 'chi-bounce';
    return '';
  };

  return (
    <div 
      className="w-[280px] min-w-[280px] bg-write-bg border-l border-write-border flex flex-col h-full overflow-y-auto select-none scrollbar-thin scrollbar-thumb-write-border"
      data-lenis-prevent="true"
    >
      {/* Chi Character */}
      <div className="p-5 border-b border-write-border">
        <div className="text-[10px] uppercase font-bold text-write-text3 mb-4 tracking-wider">Asisten Chi</div>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 bg-write-bg2 border-2 border-write-border rounded-full flex items-center justify-center text-[28px] shadow-sm relative transition-all duration-300 ${getChiAnimation()}`}>
            <div className="inline-block">{getChiEmoji()}</div>
          </div>
          <div className="bg-write-bg2 border border-write-border rounded-write p-3 px-4 relative max-w-full">
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-write-border" />
            <div className="text-[12px] text-write-text text-center leading-relaxed italic">{chiMood.comment}</div>
          </div>
        </div>
      </div>

      {/* Statistik Dokumen */}
      <div className="p-5 border-b border-write-border">
        <div className="text-[10px] uppercase font-bold text-write-text3 mb-4 tracking-wider">Statistik Dokumen</div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2.5 rounded-write bg-write-bg2 border border-write-border flex flex-col items-center transition-all duration-120 hover:border-write-border2">
            <div className="text-[15px] font-bold text-write-text">{formatNumber(stats.words)}</div>
            <div className="text-[9px] uppercase font-bold text-write-text3 mt-0.5">Kata</div>
          </div>
          <div className="p-2.5 rounded-write bg-write-bg2 border border-write-border flex flex-col items-center transition-all duration-120 hover:border-write-border2">
            <div className="text-[15px] font-bold text-write-text">{formatNumber(stats.chars)}</div>
            <div className="text-[9px] uppercase font-bold text-write-text3 mt-0.5">Karakter</div>
          </div>
          <div className="p-2.5 rounded-write bg-write-bg2 border border-write-border flex flex-col items-center transition-all duration-120 hover:border-write-border2">
            <div className="text-[15px] font-bold text-write-text">{stats.sentences}</div>
            <div className="text-[9px] uppercase font-bold text-write-text3 mt-0.5">Kalimat</div>
          </div>
          <div className="p-2.5 rounded-write bg-write-bg2 border border-write-border flex flex-col items-center transition-all duration-120 hover:border-write-border2">
            <div className="text-[15px] font-bold text-write-text">{stats.paragraphs}</div>
            <div className="text-[9px] uppercase font-bold text-write-text3 mt-0.5">Paragraf</div>
          </div>
          <div className="p-2.5 rounded-write bg-write-bg2 border border-write-border flex flex-col items-center transition-all duration-120 hover:border-write-border2 col-span-2">
            <div className="text-[15px] font-bold text-write-text">{stats.readingTime}</div>
            <div className="text-[9px] uppercase font-bold text-write-text3 mt-0.5">Menit Baca</div>
          </div>
        </div>
      </div>

      {/* Quality Score */}
      <div className="p-5 border-b border-write-border">
        <div className="text-[10px] uppercase font-bold text-write-text3 mb-4 tracking-wider">Skor Kualitas</div>
        <div className="flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-medium text-write-text">
              <span>Orisinalitas</span>
              <span className="font-bold text-green-500">87%</span>
            </div>
            <div className="w-full h-1.5 bg-write-bg2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-green-500" style={{ width: '87%' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-medium text-write-text">
              <span>Keterbacaan</span>
              <span className="font-bold text-write-blue">92%</span>
            </div>
            <div className="w-full h-1.5 bg-write-bg2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-write-blue" style={{ width: '92%' }} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-medium text-write-text">
              <span>Koherensi</span>
              <span className="font-bold text-write-orange">78%</span>
            </div>
            <div className="w-full h-1.5 bg-write-bg2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-write-orange" style={{ width: '78%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Panel Analisis (muncul setelah auto-generate) */}
      {showAnalysis && (
        <div className="p-5 border-b border-write-border bg-write-bg2 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between text-[11px] font-bold text-write-text mb-3">
            <span>Analisis Mendalam</span>
            <button className="text-[18px] text-write-text3 cursor-pointer hover:text-write-text" onClick={() => setShowAnalysis(false)}>
              ×
            </button>
          </div>
          <div className="text-[11px] text-write-text2 leading-relaxed" id="analysisPanelContent">
            {/* Content akan diisi dari auto-generate */}
          </div>
        </div>
      )}

      {/* Tips Singkat */}
      <div className="p-5">
        <div className="text-[10px] uppercase font-bold text-write-text3 mb-4 tracking-wider text-left">💡 Tips Menulis</div>
        <div className="flex flex-col gap-2 text-left">
          <div className="text-[11px] text-write-text2 leading-relaxed p-2 px-3 bg-write-bg2 border border-write-border rounded-write relative transition-all duration-120 hover:border-write-border2">
            Gunakan kalimat aktif untuk membuat tulisan lebih hidup
          </div>
          <div className="text-[11px] text-write-text2 leading-relaxed p-2 px-3 bg-write-bg2 border border-write-border rounded-write relative transition-all duration-120 hover:border-write-border2">
            Variasikan panjang kalimat agar tidak monoton
          </div>
          <div className="text-[11px] text-write-text2 leading-relaxed p-2 px-3 bg-write-bg2 border border-write-border rounded-write relative transition-all duration-120 hover:border-write-border2">
            Selalu cantumkan sumber saat mengutip
          </div>
        </div>
      </div>

      {/* Collaboration Panel */}
      {collaborators.length > 0 && (
        <CollaborationPanel
          collaborators={collaborators}
          activeUsers={activeUsers}
          isOwner={isOwner}
          myRole={myRole}
          onInviteClick={onInviteClick || (() => {})}
          onRemoveCollaborator={onRemoveCollaborator || (() => {})}
        />
      )}
    </div>
  );
}