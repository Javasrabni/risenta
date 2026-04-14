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
      <div className="write-container documents-dashboard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="save-dot saving" style={{ width: '24px', height: '24px', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Memuat dokumen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="write-container documents-dashboard">
      {/* Top Bar */}
      <div className="topbar">
        <div className="logo">
          <div className="logo-dot" />
          <span>write.risentta.com</span>
        </div>

        <div className="sep" />

        <h1 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Dokumen Saya
        </h1>

        <div style={{ flex: 1 }} />

        <button className="btn btn-icon" onClick={toggleDarkMode} title={darkMode ? 'Mode Terang' : 'Mode Gelap'}>
          <span>{darkMode ? '☀️' : '🌙'}</span>
        </button>

        <div className="sep" />

        {/* User Info */}
        {userData ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{userData.name}</span>
              <span style={{ color: isAdmin ? '#f59e0b' : 'var(--text3)', fontSize: '9.5px', fontWeight: 500 }}>
                {isAdmin ? '⚡ Admin' : tokenUsage.planName}
              </span>
            </div>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=${isAdmin ? 'f59e0b' : '2563eb'}&color=fff&rounded=true&font-size=0.4`}
              width={28}
              height={28}
              style={{ borderRadius: '50%' }}
              alt={userData.name}
            />
          </div>
        ) : guestData ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{guestData.name}</span>
            <Link href="/write/login" style={{ fontSize: '11px', color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
              Login
            </Link>
          </div>
        ) : null}
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <button className="dashboard-new-btn" onClick={() => setShowTemplateModal(true)}>
              <span style={{ fontSize: '20px' }}>+</span>
              Dokumen Baru
            </button>
          </div>
          <div className="dashboard-header-right">
            <input
              type="text"
              className="dashboard-search"
              placeholder="🔍 Cari dokumen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select
              className="dashboard-sort"
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
          <div className="dashboard-empty">
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
            <h2 style={{ color: 'var(--text)', marginBottom: '8px', fontSize: '18px' }}>
              {searchQuery ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
            </h2>
            <p style={{ color: 'var(--text3)', fontSize: '14px', marginBottom: '24px' }}>
              {searchQuery
                ? 'Coba kata kunci lain'
                : 'Mulai menulis sekarang dengan membuat dokumen baru'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setShowTemplateModal(true)}>
                + Buat Dokumen Baru
              </button>
            )}
          </div>
        ) : (
          <div className="documents-grid">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="doc-card"
                onClick={() => router.push(`/write/${doc.id}`)}
              >
                <div className="doc-card-header">
                  <span className="doc-card-icon">{getTemplateIcon(doc.template)}</span>
                  <button
                    className="doc-card-delete"
                    onClick={e => {
                      e.stopPropagation();
                      deleteDocument(doc.id);
                    }}
                    title="Hapus dokumen"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="doc-card-title">{doc.title || 'Dokumen Tanpa Judul'}</h3>
                <p className="doc-card-snippet">{getSnippet(doc.content)}</p>
                <div className="doc-card-meta">
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