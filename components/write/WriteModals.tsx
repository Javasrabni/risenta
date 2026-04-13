'use client';

import { useState, useRef, RefObject, useEffect } from 'react';
import { Document, DocumentType, DOCUMENT_TEMPLATES, TokenUsage } from '@/types/write';

interface WriteModalsProps {
  showAutoModal: boolean;
  setShowAutoModal: (show: boolean) => void;
  showCitationModal: boolean;
  setShowCitationModal: (show: boolean) => void;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  activeDoc?: Document;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  tokenUsage: TokenUsage;
  setTokenUsage: (usage: TokenUsage) => void;
  aiProvider: 'gemini' | 'openrouter';
  setAiProvider: (provider: 'gemini' | 'openrouter') => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  ghostEnabled: boolean;
  setGhostEnabled: (enabled: boolean) => void;
  sfxEnabled: boolean;
  setSfxEnabled: (enabled: boolean) => void;
  onAutoGenerate?: (content: string, topic: string) => void;
  aiGeneratingRef?: RefObject<((isGenerating: boolean) => void) | null>;
}

export default function WriteModals({
  showAutoModal,
  setShowAutoModal,
  showCitationModal,
  setShowCitationModal,
  showUpgradeModal,
  setShowUpgradeModal,
  showSettingsModal,
  setShowSettingsModal,
  activeDoc,
  updateDocument,
  tokenUsage,
  setTokenUsage,
  aiProvider,
  setAiProvider,
  darkMode,
  toggleDarkMode,
  ghostEnabled,
  setGhostEnabled,
  sfxEnabled,
  setSfxEnabled,
  onAutoGenerate,
  aiGeneratingRef,
}: WriteModalsProps) {
  const [topic, setTopic] = useState('');
  const [docType, setDocType] = useState<DocumentType>('essay');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [citationText, setCitationText] = useState('');
  const [citationAuthor, setCitationAuthor] = useState('');
  const [citationYear, setCitationYear] = useState('');
  const [citationSource, setCitationSource] = useState('');

  const handleAutoGenerate = async () => {
    if (!topic.trim() || !activeDoc) return;

    setIsGenerating(true);
    // Trigger AI generating animation in editor
    aiGeneratingRef?.current?.(true);
    // Close popup immediately when generation starts
    setShowAutoModal(false);

    try {
      // Get template-specific AI prompt if available
      const templateDef = activeDoc.template ? DOCUMENT_TEMPLATES[activeDoc.template] : null;
      const aiPrompt = templateDef ? 
        `${templateDef.aiPrompt}\n\nTopik: ${topic}\nPanjang: ${length}` : 
        `Buatkan artikel ${docType} tentang "${topic}" dengan panjang ${length}.`;
      
      const apiEndpoint = aiProvider === 'gemini' ? '/api/write/gemini' : '/api/write/openrouter';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auto-generate',
          topic,
          length,
          templatePrompt: aiPrompt,
        }),
      });

      const data = await response.json();

      if (data.success && data.content) {
        // Stop AI generating animation before typing starts
        aiGeneratingRef?.current?.(false);
        // Pass content to parent for typing animation
        onAutoGenerate?.(data.content, topic);
        setTopic('');
      } else {
        aiGeneratingRef?.current?.(false);
        alert('Gagal generate artikel: ' + (data.error || 'Respons kosong dari AI'));
      }
    } catch (error) {
      aiGeneratingRef?.current?.(false);
      console.error('Error generating:', error);
      alert('Terjadi kesalahan saat generate artikel');
    } finally {
      setIsGenerating(false);
    }
  };

  const showAnalysisPanel = () => {
    const panel = document.getElementById('analysisPanel');
    const content = document.getElementById('analysisPanelContent');
    
    if (panel && content) {
      panel.style.display = 'block';
      content.innerHTML = `
        <div style="margin-bottom:10px;padding:9px 11px;background:var(--green-bg);border-left:3px solid var(--green);border-radius:0 6px 6px 0;font-size:11px;line-height:1.6">
          <strong style="color:var(--green);display:block;margin-bottom:5px;font-size:11.5px">Keunggulan Topik ini</strong>
          Topik "${topic}" memiliki relevansi tinggi dengan isu kontemporer yang berkembang di masyarakat akademis maupun publik luas.
        </div>
        <div style="margin-bottom:10px;padding:9px 11px;background:var(--red-bg);border-left:3px solid var(--red);border-radius:0 6px 6px 0;font-size:11px;line-height:1.6">
          <strong style="color:var(--red);display:block;margin-bottom:5px;font-size:11.5px">Celah dan Keterbatasan</strong>
          Beberapa area yang perlu diperkuat: dukungan data primer, pembatasan konteks yang lebih jelas, dan pendalaman argumentasi.
        </div>
      `;
    }
  };

  const handleInsertCitation = () => {
    if (!citationAuthor || !citationYear) {
      alert('Mohon isi minimal Author dan Tahun');
      return;
    }

    const citationHTML = `<sup class="citation" data-author="${citationAuthor}" data-year="${citationYear}" data-source="${citationSource}">[${citationAuthor}, ${citationYear}]</sup>`;
    
    // Insert ke editor
    document.execCommand('insertHTML', false, citationHTML);

    // Reset form
    setCitationText('');
    setCitationAuthor('');
    setCitationYear('');
    setCitationSource('');
    setShowCitationModal(false);
  };

  const [availablePlans, setAvailablePlans] = useState<Array<{
    planId: string;
    name: string;
    price: number;
    durationDays: number;
    limits: { autoGenerate: number; prompt: number };
  }>>([]);

  // Fetch available plans when upgrade modal opens (public API)
  useEffect(() => {
    if (showUpgradeModal) {
      fetch('/api/plans')
        .then(res => res.json())
        .then(data => {
          if (data.plans) {
            setAvailablePlans(data.plans);
          }
        })
        .catch(err => console.error('Error fetching plans:', err));
    }
  }, [showUpgradeModal]);

  const handleUpgrade = (planId: string) => {
    // For now, show a message that payment gateway is not yet integrated
    alert('Fitur pembayaran akan segera hadir. Silakan hubungi admin untuk aktivasi manual.');
    setShowUpgradeModal(false);
  };

  if (!showAutoModal && !showCitationModal && !showUpgradeModal && !showSettingsModal) return null;

  return (
    <>
      {/* Auto Generate Modal */}
      {showAutoModal && (
        <div className="modal-overlay" onClick={() => setShowAutoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Auto-Generate Artikel</h2>
              <button className="close-btn" onClick={() => setShowAutoModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Topik Artikel</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Dampak AI terhadap Pendidikan"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Provider AI</label>
                <select
                  className="form-select"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openrouter')}
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="openrouter">OpenRouter (Llama 3.1 Free)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Jenis Dokumen</label>
                <select
                  className="form-select"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                >
                  <option value="essay">Essay</option>
                  <option value="article">Artikel</option>
                  <option value="journal">Jurnal</option>
                  <option value="thesis">Thesis</option>
                </select>
              </div>

              <div className="form-group">
                <label>Panjang Artikel</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="length"
                      value="short"
                      checked={length === 'short'}
                      onChange={(e) => setLength('short')}
                    />
                    Pendek (1500-2000 kata)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="length"
                      value="medium"
                      checked={length === 'medium'}
                      onChange={(e) => setLength('medium')}
                    />
                    Sedang (2500-3500 kata)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="length"
                      value="long"
                      checked={length === 'long'}
                      onChange={(e) => setLength('long')}
                    />
                    Panjang (4000-5000 kata)
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowAutoModal(false)}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAutoGenerate}
                disabled={isGenerating || !topic.trim()}
              >
                {isGenerating ? '⏳ Generating...' : '✨ Generate Artikel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✨ Upgrade ke Pro</h2>
              <button className="close-btn" onClick={() => setShowUpgradeModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Pilih Plan</label>
                <div className="plan-options">
                  {availablePlans.length > 0 ? (
                    availablePlans.map((plan) => (
                      <div
                        key={plan.planId}
                        className={`plan-option ${plan.planId === 'weekly-25k' ? 'plan-recommended' : ''}`}
                        onClick={() => handleUpgrade(plan.planId)}
                      >
                        {plan.planId === 'weekly-25k' && <div className="plan-badge">Recommended</div>}
                        <div className="plan-name">{plan.name}</div>
                        <div className="plan-price">Rp {plan.price.toLocaleString('id-ID')}/{plan.durationDays} hari</div>
                        <ul className="plan-features">
                          <li>Auto-generate: {plan.limits.autoGenerate === -1 ? 'Unlimited' : plan.limits.autoGenerate}x</li>
                          <li>Prompt AI: {plan.limits.prompt === -1 ? 'Unlimited' : plan.limits.prompt}x</li>
                          <li>Semua fitur AI</li>
                        </ul>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text2)' }}>
                      Memuat plan...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowUpgradeModal(false)}>
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citation Modal */}
      {showCitationModal && (
        <div className="modal-overlay" onClick={() => setShowCitationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Sitasi</h2>
              <button className="close-btn" onClick={() => setShowCitationModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Author *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nama Penulis"
                  value={citationAuthor}
                  onChange={(e) => setCitationAuthor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Tahun *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="2024"
                  value={citationYear}
                  onChange={(e) => setCitationYear(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Sumber</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Judul buku/jurnal"
                  value={citationSource}
                  onChange={(e) => setCitationSource(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Teks Kutipan (opsional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Teks yang dikutip..."
                  value={citationText}
                  onChange={(e) => setCitationText(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCitationModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleInsertCitation}>
                📚 Insert Sitasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Pengaturan</h2>
              <button className="close-btn" onClick={() => setShowSettingsModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Dark Mode Toggle */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label style={{ margin: 0 }}>🌙 Mode Gelap</label>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Tampilan lebih nyaman di malam hari</div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="btn"
                  style={{
                    background: darkMode ? 'var(--orange)' : 'var(--bg2)',
                    color: darkMode ? 'white' : 'var(--text)',
                  }}
                >
                  {darkMode ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {/* Ghost Text Toggle */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label style={{ margin: 0 }}>👻 Saran AI (Ghost Text)</label>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Tampilkan saran penulisan saat mengetik</div>
                </div>
                <button
                  onClick={() => setGhostEnabled(!ghostEnabled)}
                  className="btn"
                  style={{
                    background: ghostEnabled ? 'var(--green)' : 'var(--bg2)',
                    color: ghostEnabled ? 'white' : 'var(--text)',
                  }}
                >
                  {ghostEnabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {/* SFX Toggle */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label style={{ margin: 0 }}>🔊 Efek Suara</label>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Suara untuk milestone dan notifikasi</div>
                </div>
                <button
                  onClick={() => setSfxEnabled(!sfxEnabled)}
                  className="btn"
                  style={{
                    background: sfxEnabled ? 'var(--blue)' : 'var(--bg2)',
                    color: sfxEnabled ? 'white' : 'var(--text)',
                  }}
                >
                  {sfxEnabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(false)}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}