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
    <div className="right-panel">
      {/* Chi Character */}
      <div className="chi-section">
        <div className="chi-label">Asisten Chi</div>
        <div className="chi-card">
          <div className={`chi-avatar ${getChiAnimation()}`}>
            <div className="chi-emoji">{getChiEmoji()}</div>
          </div>
          <div className="chi-bubble">
            <div className="chi-comment">{chiMood.comment}</div>
          </div>
        </div>
      </div>

      {/* Statistik Dokumen */}
      <div className="stats-section">
        <div className="stats-label">Statistik Dokumen</div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{formatNumber(stats.words)}</div>
            <div className="stat-label">Kata</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{formatNumber(stats.chars)}</div>
            <div className="stat-label">Karakter</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.sentences}</div>
            <div className="stat-label">Kalimat</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.paragraphs}</div>
            <div className="stat-label">Paragraf</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.readingTime}</div>
            <div className="stat-label">Menit Baca</div>
          </div>
        </div>
      </div>

      {/* Quality Score */}
      <div className="quality-section">
        <div className="quality-label">Skor Kualitas</div>
        <div className="quality-meters">
          <div className="meter-item">
            <div className="meter-header">
              <span>Orisinalitas</span>
              <span className="meter-score">87%</span>
            </div>
            <div className="meter-bar">
              <div className="meter-fill" style={{ width: '87%', background: 'var(--green)' }} />
            </div>
          </div>

          <div className="meter-item">
            <div className="meter-header">
              <span>Keterbacaan</span>
              <span className="meter-score">92%</span>
            </div>
            <div className="meter-bar">
              <div className="meter-fill" style={{ width: '92%', background: 'var(--blue)' }} />
            </div>
          </div>

          <div className="meter-item">
            <div className="meter-header">
              <span>Koherensi</span>
              <span className="meter-score">78%</span>
            </div>
            <div className="meter-bar">
              <div className="meter-fill" style={{ width: '78%', background: 'var(--orange)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Panel Analisis (muncul setelah auto-generate) */}
      {showAnalysis && (
        <div className="analysis-panel">
          <div className="analysis-header">
            <span>Analisis Mendalam</span>
            <button className="close-btn" onClick={() => setShowAnalysis(false)}>
              ×
            </button>
          </div>
          <div className="analysis-content" id="analysisPanelContent">
            {/* Content akan diisi dari auto-generate */}
          </div>
        </div>
      )}

      {/* Tips Singkat */}
      <div className="tips-section">
        <div className="tips-label">💡 Tips Menulis</div>
        <div className="tips-list">
          <div className="tip-item">
            Gunakan kalimat aktif untuk membuat tulisan lebih hidup
          </div>
          <div className="tip-item">
            Variasikan panjang kalimat agar tidak monoton
          </div>
          <div className="tip-item">
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