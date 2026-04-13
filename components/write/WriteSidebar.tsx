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
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">
          Plan: {tokenUsage.planName}
          {tokenUsage.isExpired && <span className="plan-expired-badge">EXPIRED</span>}
        </div>

        {/* AI Usage Card - Merged */}
        <div className="token-card">
          <div className="token-header">
            <span className="token-label-small">Sisa Usage AI</span>
            <span className="token-value">{tokenUsage.autoGenerateRemaining === -1 && tokenUsage.promptRemaining === -1 ? '∞' : totalRemaining}</span>
            <span className="token-separator">/</span>
            <span className="token-limit">{tokenUsage.autoGenerateTotal === -1 && tokenUsage.promptTotal === -1 ? '∞' : totalQuota}</span>
            <span className="token-percentage">({Math.round(100 - totalProgress)}%)</span>
          </div>
          <div className="token-bar-wrap">
            <div className="token-track">
              <div
                className="token-fill"
                style={{
                  width: `${100 - totalProgress}%`,
                  background: totalProgress > 90 ? 'var(--red)' : 'var(--green)'
                }}
              />
            </div>
          </div>
          <div className="token-details" style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px' }}>
            <div>
              <span style={{ color: 'var(--text3)' }}>Auto: </span>
              <span style={{ fontWeight: 600 }}>
                {tokenUsage.autoGenerateRemaining === -1 ? '∞' : tokenUsage.autoGenerateRemaining}
              </span>
              <span style={{ color: 'var(--text3)' }}>/{tokenUsage.autoGenerateTotal === -1 ? '∞' : tokenUsage.autoGenerateTotal}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text3)' }}>Prompt: </span>
              <span style={{ fontWeight: 600 }}>
                {tokenUsage.promptRemaining === -1 ? '∞' : tokenUsage.promptRemaining}
              </span>
              <span style={{ color: 'var(--text3)' }}>/{tokenUsage.promptTotal === -1 ? '∞' : tokenUsage.promptTotal}</span>
            </div>
          </div>
        </div>

        <div className="progress-bar-wrap" style={{ marginTop: '16px' }}>
          <div className="progress-label">
            <span>Target Harian</span>
            <span>
              {formatNumber(dailyTarget.current)}/{formatNumber(dailyTarget.words)}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${dailyProgress}%` }} />
          </div>
        </div>

        {isFreePlan && (
          <div className="target-card" onClick={() => setShowUpgradeModal(true)}>
            <span>Upgrade Plan</span>
            <span>✨</span>
          </div>
        )}
      </div>

      <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="sidebar-label">Dokumen Saya {documents.length > 0 && `(${documents.length})`}</div>
         <div className="new-doc-btn" onClick={showTemplateSelector}>
          + Dokumen Baru
        </div>
        <div className="doc-list">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={`doc-item ${doc.id === activeDocId ? 'active' : ''}`}
              onClick={() => setActiveDocId(doc.id)}
              onMouseEnter={() => setHoveredDocId(doc.id)}
              onMouseLeave={() => setHoveredDocId(null)}
            >
              <div className="doc-icon">📄</div>
              <div className="doc-info">
                <div className="doc-name">{doc.title}</div>
                <div className="doc-meta">
                  {formatNumber(doc.wordCount)} kata • {formatDate(doc.updatedAt)}
                </div>
              </div>
              
              {/* 3-dot menu button - visible on hover or when menu is open */}
              {(hoveredDocId === doc.id || menuOpenDocId === doc.id) && (
                <div className="doc-menu-container" ref={menuOpenDocId === doc.id ? menuRef : null}>
                  <button
                    className="doc-menu-btn"
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
                    <div className="doc-dropdown-menu">
                      <button
                        className="doc-dropdown-item delete"
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