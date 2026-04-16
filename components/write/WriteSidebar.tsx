'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, TokenUsage, DailyTarget } from '@/types/write';
import { formatDate, formatNumber } from '@/lib/writeUtils';

interface WriteSidebarProps {
  documents: Document[];
  activeDocId: string;
  setActiveDocId: (id: string) => void;
  createNewDocument: () => void;
  showTemplateSelector: () => void;
  deleteDocument: (id: string) => void;
  tokenUsage: TokenUsage;
  setShowUpgradeModal: (show: boolean) => void;
  dailyTarget: DailyTarget;
  setDailyTarget: (target: DailyTarget) => void;
}

export default function WriteSidebar({
  documents,
  activeDocId,
  setActiveDocId,
  createNewDocument,
  showTemplateSelector,
  deleteDocument,
  tokenUsage,
  setShowUpgradeModal,
  dailyTarget,
  setDailyTarget,
}: WriteSidebarProps) {
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);
  const [menuOpenDocId, setMenuOpenDocId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dailyProgress = Math.min(100, (dailyTarget.current / dailyTarget.words) * 100);

  // Calculate total usage
  const totalRemaining = (tokenUsage.autoGenerateRemaining === -1 ? 0 : tokenUsage.autoGenerateRemaining) + 
                         (tokenUsage.promptRemaining === -1 ? 0 : tokenUsage.promptRemaining);
  const totalQuota = (tokenUsage.autoGenerateTotal === -1 ? 0 : tokenUsage.autoGenerateTotal) + 
                     (tokenUsage.promptTotal === -1 ? 0 : tokenUsage.promptTotal);
  
  const totalUsed = totalQuota - totalRemaining;
  const totalProgress = totalQuota > 0 ? Math.min(100, (totalUsed / totalQuota) * 100) : 0;

  // Check if plan is free (needs upgrade)
  const isFreePlan = tokenUsage.planId === 'free' || tokenUsage.isExpired;

  const handleTargetClick = () => {
    const newTarget = prompt('Masukkan target kata harian:', String(dailyTarget.words));
    if (newTarget && !isNaN(Number(newTarget))) {
      const updated = { ...dailyTarget, words: Number(newTarget) };
      setDailyTarget(updated);
      localStorage.setItem('write-daily-target', JSON.stringify(updated));
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenDocId(null);
      }
    };

    if (menuOpenDocId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenDocId]);

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setMenuOpenDocId(null);
    
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan.')) {
      await deleteDocument(docId);
    }
  };

  return (
    <div className="w-[260px] min-w-[260px] bg-write-bg border-r border-write-border flex flex-col h-full overflow-hidden select-none">
      <div className="p-4 border-b border-write-border">
        <div className="text-[10px] uppercase font-bold text-write-text3 mb-3 tracking-wider flex items-center gap-2">
          Plan: {tokenUsage.planName}
          {tokenUsage.isExpired && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded ml-auto font-black">EXPIRED</span>}
        </div>

        {/* AI Usage Card - Merged */}
        <div className="bg-write-bg2 border border-write-border rounded-write p-3 cursor-default transition-all duration-120 hover:border-write-border2">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[11px] text-write-text2 font-medium flex-1 text-left">Sisa Usage AI</span>
            <span className="text-[13px] font-bold text-write-text">{tokenUsage.autoGenerateRemaining === -1 && tokenUsage.promptRemaining === -1 ? '∞' : totalRemaining}</span>
            <span className="text-[11px] text-write-text3">/</span>
            <span className="text-[11px] text-write-text2">{tokenUsage.autoGenerateTotal === -1 && tokenUsage.promptTotal === -1 ? '∞' : totalQuota}</span>
            <span className="text-[10px] text-write-text3 ml-1">({Math.round(100 - totalProgress)}%)</span>
          </div>
          <div className="w-full h-1.5 bg-write-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${totalProgress > 90 ? 'bg-red-500' : 'bg-green-500'}`}
              style={{
                width: `${100 - totalProgress}%`,
              }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <div>
              <span className="text-write-text3">Auto: </span>
              <span className="font-semibold text-write-text">
                {tokenUsage.autoGenerateRemaining === -1 ? '∞' : tokenUsage.autoGenerateRemaining}
              </span>
              <span className="text-write-text3">/{tokenUsage.autoGenerateTotal === -1 ? '∞' : tokenUsage.autoGenerateTotal}</span>
            </div>
            <div>
              <span className="text-write-text3">Prompt: </span>
              <span className="font-semibold text-write-text">
                {tokenUsage.promptRemaining === -1 ? '∞' : tokenUsage.promptRemaining}
              </span>
              <span className="text-write-text3">/{tokenUsage.promptTotal === -1 ? '∞' : tokenUsage.promptTotal}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="font-medium text-write-text2">Target Harian</span>
            <span className="font-bold text-write-text">
              {formatNumber(dailyTarget.current)}/{formatNumber(dailyTarget.words)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-write-bg2 border border-write-border rounded-full overflow-hidden">
            <div className="h-full bg-write-orange rounded-full transition-all duration-300" style={{ width: `${dailyProgress}%` }} />
          </div>
        </div>

        {isFreePlan && (
          <div className="mt-3 p-2.5 px-3 bg-write-orange/10 border border-write-orange/20 rounded-write flex items-center justify-between text-[12px] font-bold text-write-orange cursor-pointer transition-all duration-120 hover:bg-write-orange/20 hover:border-write-orange/30 shadow-sm" onClick={() => setShowUpgradeModal(true)}>
            <span>Upgrade Plan</span>
            <span>✨</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <div className="text-[10px] uppercase font-bold text-write-text3 mb-3 tracking-wider">Dokumen Saya {documents.length > 0 && `(${documents.length})`}</div>
         <div className="w-full p-2.5 rounded-write bg-write-blue text-white text-[13px] font-bold text-center cursor-pointer transition-all duration-120 shadow-sm hover:bg-write-blue2 mb-4" onClick={showTemplateSelector}>
          + Dokumen Baru
        </div>
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-write-border">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={`flex items-center gap-3 p-3 rounded-write cursor-pointer transition-all duration-120 mb-1 relative border ${doc.id === activeDocId ? 'bg-write-bg2 border-write-border shadow-sm active' : 'border-transparent hover:bg-write-bg2 hover:border-write-border'}`}
              onClick={() => setActiveDocId(doc.id)}
              onMouseEnter={() => setHoveredDocId(doc.id)}
              onMouseLeave={() => setHoveredDocId(null)}
            >
              <div className="text-[18px]">📄</div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium text-write-text truncate">{doc.title}</div>
                <div className="text-[10px] text-write-text3 truncate mt-0.5">
                  {formatNumber(doc.wordCount)} kata • {formatDate(doc.updatedAt)}
                </div>
              </div>
              
              {/* 3-dot menu button - visible on hover or when menu is open */}
              {(hoveredDocId === doc.id || menuOpenDocId === doc.id) && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center" ref={menuOpenDocId === doc.id ? menuRef : null}>
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-sm text-write-text3 hover:bg-write-bg3 hover:text-write-text transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenDocId(menuOpenDocId === doc.id ? null : doc.id);
                    }}
                    title="Opsi"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="4" r="1.5"/>
                      <circle cx="8" cy="8" r="1.5"/>
                      <circle cx="8" cy="12" r="1.5"/>
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  {menuOpenDocId === doc.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-write-bg border border-write-border rounded-write shadow-write-lg py-1 z-[60] animate-in fade-in zoom-in duration-100">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 transition-all text-left"
                        onClick={(e) => handleDelete(e, doc.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 3.5h10M4.5 3.5V2a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 019.5 2v1.5M11.5 3.5v8a1.5 1.5 0 01-1.5 1.5H4a1.5 1.5 0 01-1.5-1.5v-8"/>
                        </svg>
                        <span>Hapus Dokumen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
       
      </div>
    </div>
  );
}