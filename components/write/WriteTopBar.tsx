'use client';

import { useState, useEffect, useRef } from 'react';
import { Document } from '@/types/write';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
}

interface WriteTopBarProps {
  activeDoc?: Document;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  showFormatBar: boolean;
  setShowFormatBar: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  isAdmin?: boolean;
  userData?: { name: string; role: string; isInternalAdmin?: boolean; id?: string } | null;
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  autoSaveStatus?: { isAutoSaving: boolean; lastSaved: Date | null };
  isLoading?: boolean;
  onSave?: () => void;
  onShare?: () => void;
  collaboratorCount?: number;
  pendingCount?: number;
  activeUsers?: any[];
  mode?: 'dashboard' | 'editor';
  onBack?: () => void;
}

export default function WriteTopBar({
  activeDoc,
  updateDocument,
  darkMode,
  toggleDarkMode,
  showFormatBar,
  setShowFormatBar,
  setShowSettingsModal,
  isAdmin,
  userData,
  saveStatus = 'saved',
  autoSaveStatus,
  isLoading = false,
  onSave,
  onShare,
  collaboratorCount = 0,
  pendingCount = 0,
  activeUsers = [],
  mode = 'editor',
  onBack,
}: WriteTopBarProps) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(!userData); // Skip loading if userData provided
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeDoc?.title !== undefined && activeDoc.title !== title) {
      setTitle(activeDoc.title);
    }
  }, [activeDoc?.id, activeDoc?.title]);

  // Fetch user data on mount (skip if userData provided via props)
  useEffect(() => {
    if (userData) {
      // Use provided userData, no need to fetch
      setLoadingUser(false);
      return;
    }
    
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, [userData]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    try {
      // Try admin logout first
      let res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // If admin logout fails (not an admin), try customer logout
      if (!res.ok) {
        res = await fetch('/api/customer/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      }

      if (res.ok) {
        // Clear localStorage on logout (preserve theme only)
        const theme = localStorage.getItem('theme');
        localStorage.clear();
        if (theme) localStorage.setItem('theme', theme);

        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
  };

  const handleTitleBlur = () => {
    if (activeDoc && title !== activeDoc.title) {
      setSaving(true);
      updateDocument(activeDoc.id, { title });
      setTimeout(() => setSaving(false), 800);
    }
  };

  const handleExport = (format: 'txt' | 'md' | 'docx' | 'pdf') => {
    if (!activeDoc) return;
    
    const title = activeDoc.title || 'dokumen';
    let blob: Blob;
    let mimeType: string;
    let extension: string;
    
    switch (format) {
      case 'txt':
        // Strip HTML tags for plain text
        const plainText = activeDoc.content.replace(/<[^>]*>/g, '');
        blob = new Blob([plainText], { type: 'text/plain' });
        extension = 'txt';
        break;
      case 'md':
        // Simple HTML to Markdown conversion
        let md = activeDoc.content
          .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, '');
        blob = new Blob([md], { type: 'text/markdown' });
        extension = 'md';
        break;
      case 'docx':
      case 'pdf':
        alert(`Export ke ${format.toUpperCase()} memerlukan backend processing`);
        setShowExportModal(false);
        return;
      default:
        blob = new Blob([activeDoc.content], { type: 'text/html' });
        extension = 'html';
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="topbar">
      {onBack && mode === 'editor' && (
        <button
          className="btn btn-icon topbar-back-btn"
          onClick={onBack}
          title="Kembali ke Dokumen"
          style={{ marginRight: '4px' }}
        >
          <span>←</span>
        </button>
      )}
      <div className="logo">
        <div className="logo-dot" />
        <span>write.risentta.com</span>
      </div>

      <div className="sep" />

      <input
        type="text"
        className="doc-title-input"
        value={title}
        onChange={handleTitleChange}
        onBlur={handleTitleBlur}
        placeholder="Dokumen Tanpa Judul"
      />

      <div className="save-pill">
        {isLoading ? (
          <>
            <div className="save-dot saving" />
            <span>Memuat...</span>
          </>
        ) : autoSaveStatus?.isAutoSaving ? (
          <>
            <div className="save-dot saving" />
            <span>Menyimpan draft...</span>
          </>
        ) : (
          <>
            <div className={`save-dot ${saveStatus === 'saving' ? 'saving' : saveStatus === 'unsaved' ? 'unsaved' : ''}`} />
            <span>
              {saveStatus === 'saving' ? 'Menyimpan ke Cloud...' : 
               saveStatus === 'unsaved' ? 'Draft tersimpan lokal' : 
               autoSaveStatus?.lastSaved ? 'Draft tersimpan lokal' : 'Siap'}
            </span>
          </>
        )}
      </div>

      {onSave && (
        <button
          className="btn btn-primary btn-save"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          title="Simpan ke Database (Ctrl+S)"
        >
          {saveStatus === 'saving' ? 'Menyimpan...' : 'Simpan'}
        </button>
      )}

      <div style={{ flex: 1 }} />

      <button
        className="btn btn-icon"
        onClick={() => setShowFormatBar(!showFormatBar)}
        title={showFormatBar ? 'Sembunyikan Format Bar' : 'Tampilkan Format Bar'}
      >
        <span>{showFormatBar ? '📐' : '📏'}</span>
      </button>

      <button className="btn btn-icon" onClick={() => setShowExportModal(true)} title="Export">
        <span>💾</span>
      </button>

      {/* Active Users Avatars */}
      {activeUsers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px', gap: '-6px' }}>
          {activeUsers.map((u, i) => (
            <div 
              key={u.socketId || i}
              title={u.userName || `Guest ${u.userId?.substring(0,4) || ''}`}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: u.userColor || `hsl(${(i * 50) % 360}, 70%, 50%)`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                border: '2px solid var(--bg)',
                marginLeft: i > 0 ? '-8px' : '0',
                zIndex: activeUsers.length - i
              }}
            >
              {(u.userName || 'Tamu').charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {onShare && activeDoc?.id && (
        <button
          className="btn btn-icon"
          onClick={onShare}
          title={pendingCount > 0 ? `${pendingCount} Permintaan Bergabung` : 'Bagikan Dokumen'}
          style={{ position: 'relative' }}
        >
          <span>🔗</span>
          {(collaboratorCount > 0 || pendingCount > 0) && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                background: pendingCount > 0 ? 'var(--red)' : 'var(--blue)',
                borderRadius: '50%',
                fontSize: '10px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: pendingCount > 0 ? 'pulse 2s infinite' : 'none',
              }}
            >
              {pendingCount > 0 ? pendingCount : collaboratorCount}
            </span>
          )}
        </button>
      )}

      <button className="btn btn-icon" onClick={handlePrint} title="Print">
        <span>🖨️</span>
      </button>

      <button
        className="btn btn-icon"
        onClick={toggleDarkMode}
        title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
      >
        <span>{darkMode ? '☀️' : '🌙'}</span>
      </button>

      <button
        className="btn btn-icon"
        onClick={() => setShowSettingsModal(true)}
        title="Settings"
      >
        <span>⚙️</span>
      </button>

      <div className="sep" />

      {/* Profile Component */}
      {loadingUser ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg2)' }} />
        </div>
      ) : user || userData ? (
        <div
          ref={profileMenuRef}
          style={{ position: 'relative' }}
        >
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              borderRadius: 'var(--radius)',
              transition: 'background 0.2s',
              border: 'none',
              background: showProfileMenu ? 'var(--bg2)' : 'transparent',
              cursor: 'pointer',
            }}
            title={isAdmin ? 'Admin Access' : 'Informasi Akun'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                {user?.name || userData?.name || 'Penulis'}
              </span>
              <span style={{
                fontSize: '9.5px',
                fontWeight: 500,
                lineHeight: 1,
                marginTop: '3px',
                color: isAdmin ? '#f59e0b' : 'var(--text3)',
              }}>
                {isAdmin
                  ? (userData?.isInternalAdmin ? '🔒 Internal Admin' : '⚡ Admin')
                  : user?.role === 'user'
                    ? 'Member'
                    : 'Free Guest'}
              </span>
            </div>
            <img
              src={user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || user?.name || 'Penulis')}&background=${isAdmin ? 'f59e0b' : '2563eb'}&color=fff&rounded=true&font-size=0.4`}
              width={28}
              height={28}
              style={{
                borderRadius: '50%',
                boxShadow: isAdmin
                  ? '0 0 0 2px var(--bg), 0 0 0 3px #f59e0b'
                  : '0 0 0 2px var(--bg), 0 0 0 3px var(--border)',
              }}
              alt={user?.name || userData?.name || 'User'}
            />
            <span style={{ fontSize: '10px', marginLeft: '2px', color: 'var(--text3)' }}>
              {showProfileMenu ? '▲' : '▼'}
            </span>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: '180px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'slideDown 0.2s ease-out',
              }}
            >
              {/* User Info Header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg2)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  {user?.name || userData?.name || 'Penulis'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                  {user?.email || userData?.role || 'User'}
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '4px' }}>
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    fontSize: '13px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>👤</span>
                  Profil Saya
                </Link>

                {isAdmin && (
                  <Link
                    href="/adm"
                    onClick={() => setShowProfileMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: '#f59e0b',
                      fontSize: '13px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>⚡</span>
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--red)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>🚪</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            borderRadius: 'var(--radius)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)' }}>Login</span>
        </Link>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📤 Export Dokumen</h2>
              <button className="close-btn" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '8px' }}>
                <button className="btn" onClick={() => handleExport('txt')} style={{ justifyContent: 'flex-start' }}>
                  📝 Plain Text (.txt)
                </button>
                <button className="btn" onClick={() => handleExport('md')} style={{ justifyContent: 'flex-start' }}>
                  ⬇ Markdown (.md)
                </button>
                <button className="btn" onClick={() => handleExport('docx')} style={{ justifyContent: 'flex-start' }}>
                  📄 Word Document (.docx)
                </button>
                <button className="btn" onClick={() => handleExport('pdf')} style={{ justifyContent: 'flex-start' }}>
                  📑 PDF Document (.pdf)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}