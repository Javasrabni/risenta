'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TemplateSelector from '@/components/write/TemplateSelector';
import ToastContainer from '@/components/write/ToastContainer';
import { Document, TokenUsage, DEFAULT_PAGE_SETTINGS, DocumentTemplate, DOCUMENT_TEMPLATES } from '@/types/write';
import { generateId, formatNumber, formatDate } from '@/lib/writeUtils';

export default function WriteDocumentsPage() {
  const router = useRouter();

  // ── Auth & User State ──
  const [userData, setUserData] = useState<{ name: string; role: string; isInternalAdmin?: boolean; id?: string } | null>(null);
  const [guestData, setGuestData] = useState<{ id: string; name: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Documents State ──
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    planId: 'free',
    planName: 'Free',
    autoGenerateRemaining: 1,
    autoGenerateTotal: 1,
    promptRemaining: 4,
    promptTotal: 4,
    planExpiresAt: null,
    isExpired: false,
  });

  // ── Auth Check ──
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);

        const customerRes = await fetch('/api/customer/auth/me', { credentials: 'include' });
        const customerData = await customerRes.json();

        if (customerData.loggedIn) {
          setIsAuthenticated(true);
          setUserData({
            name: customerData.customer?.name || 'Customer',
            role: 'customer',
            id: customerData.customer?._id || customerData.customer?.customerID,
          });
          await fetchCustomerPlan();
          await loadDocumentsFromDB();
          return;
        }

        const adminRes = await fetch('/api/auth/me', { credentials: 'include' });
        const adminData = await adminRes.json();

        if (adminData.loggedIn) {
          setIsAuthenticated(true);
          setIsAdmin(true);
          setUserData({
            name: adminData.admin?.adm_usn || 'Admin',
            role: 'admin',
            isInternalAdmin: adminData.isInternalAdmin,
            id: adminData.admin?._id || adminData.admin?.adm_id,
          });
          await loadDocumentsFromDB();
          return;
        }

        // Guest user
        setIsAuthenticated(false);
        let guestId = localStorage.getItem('guest_id');
        let guestName = localStorage.getItem('guest_name');
        if (!guestId) {
          guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
          guestName = 'Tamu ' + Math.floor(Math.random() * 1000);
          localStorage.setItem('guest_id', guestId);
          localStorage.setItem('guest_name', guestName);
        }
        setGuestData({ id: guestId, name: guestName || 'Tamu' });
        loadDocumentsFromLocalStorage();
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
        loadDocumentsFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ── Handle shared link redirect ──
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedDocId = urlParams.get('shared');
    if (sharedDocId) {
      router.replace(`/write/${sharedDocId}?join=true`);
    }
  }, [router]);

  // ── Dark Mode ──
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('write-dark-mode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark-theme');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('write-dark-mode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  // ── Fetch Data ──
  const fetchCustomerPlan = async () => {
    try {
      const response = await fetch('/api/customer/plan', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.loggedIn && data.plan && data.usage) {
          setTokenUsage({
            planId: data.plan.planId,
            planName: data.plan.planName,
            autoGenerateRemaining: data.usage.autoGenerateTotal,
            autoGenerateTotal: data.plan.limits.autoGenerate === -1 ? -1 : data.usage.autoGenerateTotal,
            promptRemaining: data.usage.promptTotal,
            promptTotal: data.plan.limits.prompt === -1 ? -1 : data.usage.promptTotal,
            planExpiresAt: data.plan.expiresAt,
            isExpired: data.plan.isExpired,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching customer plan:', error);
    }
  };

  const loadDocumentsFromDB = async () => {
    try {
      const response = await fetch('/api/write/documents', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
          const docs = data.documents.map((doc: Document) => ({
            ...doc,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          }));
          setDocuments(docs);
        }
      }
    } catch (error) {
      console.error('Error loading documents from DB:', error);
    }
  };

  const loadDocumentsFromLocalStorage = () => {
    const saved = localStorage.getItem('write-documents');
    if (saved) {
      try {
        const docs = JSON.parse(saved).map((doc: Document) => ({
          ...doc,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        }));
        setDocuments(docs);
      } catch (e) {
        console.error('Error parsing localStorage documents:', e);
      }
    }
  };

  // ── Create Document ──
  const createNewDocument = async (template: DocumentTemplate = 'blank') => {
    const templateDef = DOCUMENT_TEMPLATES[template];
    const templateContent = generateTemplateContent(template);

    if (isAuthenticated) {
      try {
        const response = await fetch('/api/write/documents', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: templateDef.name,
            content: templateContent,
            type: templateDef.type,
            template,
            wordCount: 0,
            charCount: 0,
            pageSettings: DEFAULT_PAGE_SETTINGS,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          router.push(`/write/${data.document.id}`);
          return;
        }
      } catch (error) {
        console.error('Error creating document in DB:', error);
      }
    }

    // Guest fallback
    const newDoc: Document = {
      id: generateId(),
      title: templateDef.name,
      content: templateContent,
      type: templateDef.type,
      template,
      wordCount: 0,
      charCount: 0,
      pageSettings: DEFAULT_PAGE_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: guestData?.id || 'guest',
    };

    // Save to localStorage
    const saved = localStorage.getItem('write-documents');
    const docs = saved ? JSON.parse(saved) : [];
    docs.push(newDoc);
    localStorage.setItem('write-documents', JSON.stringify(docs));

    router.push(`/write/${newDoc.id}`);
  };

  const generateTemplateContent = (template: DocumentTemplate): string => {
    const templateDef = DOCUMENT_TEMPLATES[template];
    if (!templateDef.sections || templateDef.sections.length === 0) {
      return '<p><br></p>';
    }

    return templateDef.sections
      .map(section => {
        const placeholderLines = section.placeholder.split('\n\n');
        const placeholderHTML = placeholderLines
          .filter(line => line.trim())
          .map(
            line =>
              `<p data-template-placeholder="${section.id}" style="margin-bottom: 8px; opacity: 0.4; font-style: italic; color: var(--text3);">${line.replace(/\n/g, '<br>')}</p>`
          )
          .join('');
        return `<h3 data-template-section="${section.id}">${section.title}</h3>${placeholderHTML}<p><br></p>`;
      })
      .join('');
  };

  // ── Delete Document ──
  const deleteDocument = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;

    if (isAuthenticated) {
      try {
        await fetch(`/api/write/documents/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error deleting document from DB:', error);
      }
    }

    // Remove from local state
    setDocuments(prev => prev.filter(d => d.id !== id));

    // Update localStorage
    if (!isAuthenticated) {
      const saved = localStorage.getItem('write-documents');
      if (saved) {
        const docs = JSON.parse(saved).filter((d: Document) => d.id !== id);
        localStorage.setItem('write-documents', JSON.stringify(docs));
      }
    }
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setShowTemplateModal(false);
    createNewDocument(template);
  };

  // ── Logout ──
  const handleLogout = async () => {
    try {
      if (isAdmin) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } else {
        await fetch('/api/customer/auth/logout', { method: 'POST', credentials: 'include' });
      }
      const theme = localStorage.getItem('theme');
      localStorage.clear();
      if (theme) localStorage.setItem('theme', theme);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // ── Filter & Sort Documents ──
  const filteredDocs = documents
    .filter(doc => {
      if (!searchQuery) return true;
      return doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  // ── Get template icon ──
  const getTemplateIcon = (template?: DocumentTemplate) => {
    if (!template) return '📄';
    return DOCUMENT_TEMPLATES[template]?.icon || '📄';
  };

  // ── Get snippet from content ──
  const getSnippet = (content: string): string => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    if (!text || text === '\n') return 'Dokumen kosong';
    return text.substring(0, 120) + (text.length > 120 ? '...' : '');
  };

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-write-bg text-write-text">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-6 h-6 rounded-full bg-write-yellow animate-pulse mx-auto mb-4" />
            <p className="text-write-text3 text-[14px]">Memuat dokumen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-write-bg text-write-text">
      {/* Top Bar */}
      <div className="h-12 border-b border-write-border flex items-center px-4 gap-2.5 shrink-0 bg-write-bg">
        <div className="text-[15px] font-semibold text-write-text tracking-tight flex items-center gap-1.5 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-write-orange" />
          <span>write.risentta.com</span>
        </div>

        <div className="w-px h-[18px] bg-write-border mx-2.5" />

        <h1 className="text-[15px] font-bold text-write-text m-0">
          Dokumen Saya
        </h1>

        <div className="flex-1" />

        <button 
          className="w-7 h-7 inline-flex items-center justify-center p-0 rounded-write text-[14px] font-medium cursor-pointer border border-transparent bg-transparent text-write-text transition-all duration-150 hover:bg-write-bg2 hover:border-write-border" 
          onClick={toggleDarkMode} 
          title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
        >
          <span>{darkMode ? '☀️' : '🌙'}</span>
        </button>

        <div className="w-px h-[18px] bg-write-border mx-2.5" />

        {/* User Info */}
        {userData ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end text-[11px]">
              <span className="font-bold text-write-text">{userData.name}</span>
              <span className={`text-[9.5px] font-medium ${isAdmin ? 'text-[#f59e0b]' : 'text-write-text3'}`}>
                {isAdmin ? '⚡ Admin' : tokenUsage.planName}
              </span>
            </div>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=${isAdmin ? 'f59e0b' : '2563eb'}&color=fff&rounded=true&font-size=0.4`}
              width={28}
              height={28}
              className="rounded-full"
              alt={userData.name}
            />
          </div>
        ) : guestData ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-write-text3">{guestData.name}</span>
            <Link href="/write/login" className="text-[11px] text-write-blue no-underline font-semibold">
              Login
            </Link>
          </div>
        ) : null}
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-6 md:p-4 bg-write-bg2">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap md:flex-col md:items-stretch">
          <div className="flex items-center gap-3">
            <button 
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-write-lg bg-write-accent text-white font-medium shadow-write transition-all hover:bg-write-accent2 hover:-translate-y-px hover:shadow-write-lg" 
              onClick={() => setShowTemplateModal(true)}
            >
              <span className="text-[20px]">+</span>
              Dokumen Baru
            </button>
          </div>
          <div className="flex items-center gap-3 md:flex-col md:items-stretch">
            <div className="relative w-full max-w-[280px] md:max-w-none">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-write-border rounded-write bg-write-bg text-[13px] outline-none transition-all focus:border-write-blue focus:ring-2 focus:ring-write-blue-bg"
                placeholder="Cari dokumen..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-write-text3 text-[14px]">🔍</span>
            </div>
            <select
              className="px-3 py-2 border border-write-border rounded-write bg-write-bg text-[12px] outline-none cursor-pointer focus:border-write-blue"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="updated">Terakhir Diunduh</option>
              <option value="created">Terbaru Dibuat</option>
              <option value="title">Nama A-Z</option>
            </select>
          </div>
        </div>

        {/* Documents Grid */}
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[64px] mb-4">📝</div>
            <h2 className="text-write-text mb-2 text-[18px] font-bold">
              {searchQuery ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
            </h2>
            <p className="text-write-text3 text-[14px] mb-6">
              {searchQuery
                ? 'Coba kata kunci lain'
                : 'Mulai menulis sekarang dengan membuat dokumen baru'}
            </p>
            {!searchQuery && (
              <button 
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-write text-[12px] font-medium cursor-pointer border border-[#18181b] bg-[#18181b] text-white transition-all duration-120 hover:bg-[#27272a] hover:border-[#27272a]" 
                onClick={() => setShowTemplateModal(true)}
              >
                + Buat Dokumen Baru
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="bg-write-bg border border-write-border rounded-write-lg p-5 cursor-pointer transition-all hover:shadow-write-lg hover:border-write-border2 hover:-translate-y-0.5 group"
                onClick={() => router.push(`/write/${doc.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[24px]">{getTemplateIcon(doc.template)}</span>
                  <button
                    className="w-6 h-6 flex items-center justify-center text-write-text3 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-write-red-bg hover:text-write-red rounded"
                    onClick={e => {
                      e.stopPropagation();
                      deleteDocument(doc.id);
                    }}
                    title="Hapus dokumen"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="font-semibold text-[15px] text-write-text mb-2 group-hover:text-write-blue transition-colors line-clamp-1">
                  {doc.title || 'Dokumen Tanpa Judul'}
                </h3>
                <p className="text-[12px] text-write-text2 line-clamp-3 mb-4 leading-relaxed">
                  {getSnippet(doc.content)}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-write-text3 font-medium uppercase tracking-wider">
                  <span>{formatNumber(doc.wordCount)} kata</span>
                  <span>•</span>
                  <span>{formatDate(doc.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateSelector
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />

      <ToastContainer />
    </div>
  );
}