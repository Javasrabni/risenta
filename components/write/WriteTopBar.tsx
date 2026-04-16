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
    <div className="h-12 border-b border-write-border flex items-center px-4 gap-2.5 shrink-0 bg-write-bg">
      {onBack && mode === 'editor' && (
        <button
          className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border mr-1"
          onClick={onBack}
          title="Kembali ke Dokumen"
        >
          <span>←</span>
        </button>
      )}
      <div className="text-[15px] font-semibold text-write-text tracking-tight flex items-center gap-1.5 whitespace-nowrap">
        <div className="w-2 h-2 rounded-full bg-write-orange" />
        <span>write.risentta.com</span>
      </div>

      <div className="w-px h-[18px] bg-write-border mx-2.5" />

      <input
        type="text"
        className="flex-1 max-w-[280px] text-[13px] font-medium text-write-text border-none bg-transparent outline-none text-center min-w-0 px-2 py-1 rounded-write transition-colors hover:bg-write-bg2 focus:bg-write-bg2"
        value={title}
        onChange={handleTitleChange}
        onBlur={handleTitleBlur}
        placeholder="Dokumen Tanpa Judul"
      />

      <div className="flex items-center gap-1.25 text-[11px] text-write-text3 bg-write-bg2 border border-write-border rounded-[20px] px-2.5 py-0.5">
        {isLoading ? (
          <>
            <div className="w-1.25 h-1.25 rounded-full bg-write-yellow animate-pulse" />
            <span>Memuat...</span>
          </>
        ) : autoSaveStatus?.isAutoSaving ? (
          <>
            <div className="w-1.25 h-1.25 rounded-full bg-write-yellow animate-pulse" />
            <span>Menyimpan draft...</span>
          </>
        ) : (
          <>
            <div className={`w-1.25 h-1.25 rounded-full ${
              saveStatus === 'saving' ? 'bg-write-yellow animate-pulse' : 
              saveStatus === 'unsaved' ? 'bg-[#dc2626]' : 'bg-write-green'}`} 
            />
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
          className="inline-flex items-center gap-1.5 px-3 py-1.25 rounded-write text-[12px] font-medium cursor-pointer border transition-all duration-120 whitespace-nowrap bg-write-accent text-white border-write-accent hover:bg-write-accent2 hover:border-write-accent2 disabled:opacity-45 disabled:cursor-not-allowed ml-2"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          title="Simpan ke Database (Ctrl+S)"
        >
          {saveStatus === 'saving' ? 'Menyimpan...' : 'Simpan'}
        </button>
      )}

      <div className="flex-1" />

      <button
        className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border"
        onClick={() => setShowFormatBar(!showFormatBar)}
        title={showFormatBar ? 'Sembunyikan Format Bar' : 'Tampilkan Format Bar'}
      >
        <span>{showFormatBar ? '📐' : '📏'}</span>
      </button>

      <button 
        className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border" 
        onClick={() => setShowExportModal(true)} 
        title="Export"
      >
        <span>💾</span>
      </button>

      {/* Active Users Avatars */}
      {activeUsers.length > 0 && (
        <div className="flex items-center mx-2 -space-x-2">
          {activeUsers.map((u, i) => (
            <div 
              key={u.socketId || i}
              title={u.userName || `Guest ${u.userId?.substring(0,4) || ''}`}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-write-bg"
              style={{
                background: u.userColor || `hsl(${(i * 50) % 360}, 70%, 50%)`,
                color: 'white',
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
          className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border relative"
          onClick={onShare}
          title={pendingCount > 0 ? `${pendingCount} Permintaan Bergabung` : 'Bagikan Dokumen'}
        >
          <span>🔗</span>
          {(collaboratorCount > 0 || pendingCount > 0) && (
            <span
              className={`absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full text-[10px] text-white flex items-center justify-center ${pendingCount > 0 ? 'bg-write-red animate-pulse' : 'bg-write-blue'}`}
            >
              {pendingCount > 0 ? pendingCount : collaboratorCount}
            </span>
          )}
        </button>
      )}

      <button 
        className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border" 
        onClick={handlePrint} 
        title="Print"
      >
        <span>🖨️</span>
      </button>

      <button
        className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border"
        onClick={toggleDarkMode}
        title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
      >
        <span>{darkMode ? '☀️' : '🌙'}</span>
      </button>

      <button
        className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border"
        onClick={() => setShowSettingsModal(true)}
        title="Settings"
      >
        <span>⚙️</span>
      </button>

      <div className="w-px h-[18px] bg-write-border mx-2.5" />

      {/* Profile Component */}
      {loadingUser ? (
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-7 h-7 rounded-full bg-write-bg2 animate-pulse" />
        </div>
      ) : user || userData ? (
        <div ref={profileMenuRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-2 px-2 py-1 rounded-write transition-colors border-none cursor-pointer ${showProfileMenu ? 'bg-write-bg2' : 'bg-transparent'}`}
            title={isAdmin ? 'Admin Access' : 'Informasi Akun'}
          >
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-bold text-write-text leading-none">
                {user?.name || userData?.name || 'Penulis'}
              </span>
              <span className={`text-[9.5px] font-medium leading-none mt-[3px] ${isAdmin ? 'text-[#f59e0b]' : 'text-write-text3'}`}>
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
              className={`rounded-full shadow-[0_0_0_2px_var(--bg),0_0_0_3px_${isAdmin ? '#f59e0b' : 'var(--border)'}]`}
              alt={user?.name || userData?.name || 'User'}
            />
            <span className="text-[10px] ml-0.5 text-write-text3">
              {showProfileMenu ? '▲' : '▼'}
            </span>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute top-[calc(100%+8px)] right-0 min-w-[180px] bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Info Header */}
              <div className="p-3 px-4 border-b border-write-border bg-write-bg2">
                <div className="text-[13px] font-semibold text-write-text">
                  {user?.name || userData?.name || 'Penulis'}
                </div>
                <div className="text-[11px] text-write-text3 mt-0.5">
                  {user?.email || userData?.role || 'User'}
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-1">
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 p-2.5 px-3 rounded-md no-underline text-write-text text-[13px] transition-colors hover:bg-write-bg2"
                >
                  <span>👤</span>
                  Profil Saya
                </Link>

                {isAdmin && (
                  <Link
                    href="/adm"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 p-2.5 px-3 rounded-md no-underline text-[#f59e0b] text-[13px] transition-colors hover:bg-write-bg2"
                  >
                    <span>⚡</span>
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 p-2.5 px-3 rounded-md border-none bg-transparent text-write-red text-[13px] cursor-pointer w-full text-left transition-colors hover:bg-write-red-bg"
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
          className="no-underline flex items-center gap-2 px-2 py-1 rounded-write transition-colors hover:bg-write-bg2"
        >
          <span className="text-[11px] font-medium text-write-text3">Login</span>
        </Link>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" 
          onClick={() => setShowExportModal(false)}
        >
          <div 
            className="bg-write-bg rounded-write shadow-write-lg w-[90%] max-w-[400px] flex flex-col animate-in slide-in-from-bottom-5 duration-300" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-write-border">
              <h2 className="text-[18px] font-semibold text-write-text m-0">📤 Export Dokumen</h2>
              <button 
                className="w-8 h-8 flex items-center justify-center border-none bg-transparent text-write-text3 rounded-lg cursor-pointer transition-colors hover:bg-write-bg2 hover:text-write-text" 
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <div className="grid gap-2">
                <button 
                  className="inline-flex items-center gap-2.5 px-3 py-2.5 rounded-write text-[13px] font-medium cursor-pointer border border-write-border bg-write-bg text-write-text transition-all duration-150 justify-start hover:bg-write-bg2 hover:border-write-border2" 
                  onClick={() => handleExport('txt')}
                >
                  📝 Plain Text (.txt)
                </button>
                <button 
                  className="inline-flex items-center gap-2.5 px-3 py-2.5 rounded-write text-[13px] font-medium cursor-pointer border border-write-border bg-write-bg text-write-text transition-all duration-150 justify-start hover:bg-write-bg2 hover:border-write-border2" 
                  onClick={() => handleExport('md')}
                >
                  ⬇ Markdown (.md)
                </button>
                <button 
                  className="inline-flex items-center gap-2.5 px-3 py-2.5 rounded-write text-[13px] font-medium cursor-pointer border border-write-border bg-write-bg text-write-text transition-all duration-150 justify-start hover:bg-write-bg2 hover:border-write-border2" 
                  onClick={() => handleExport('docx')}
                >
                  📄 Word Document (.docx)
                </button>
                <button 
                  className="inline-flex items-center gap-2.5 px-3 py-2.5 rounded-write text-[13px] font-medium cursor-pointer border border-write-border bg-write-bg text-write-text transition-all duration-150 justify-start hover:bg-write-bg2 hover:border-write-border2" 
                  onClick={() => handleExport('pdf')}
                >
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