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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] animate-in fade-in duration-200" onClick={() => setShowAutoModal(false)}>
          <div className="bg-write-bg rounded-xl w-full max-w-[550px] max-h-[90vh] overflow-hidden shadow-write-lg animate-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 px-6 border-b border-write-border bg-write-bg2">
              <h2 className="m-0 text-[18px] font-semibold text-write-text">Auto-Generate Artikel</h2>
              <button className="w-8 h-8 flex items-center justify-center border-none bg-transparent rounded-md text-[20px] text-write-text cursor-pointer transition-colors hover:bg-write-bg3" onClick={() => setShowAutoModal(false)}>
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-left">
              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Topik Artikel</label>
                <input
                  type="text"
                  className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue transition-all"
                  placeholder="Contoh: Dampak AI terhadap Pendidikan"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Provider AI</label>
                <select
                  className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue transition-all cursor-pointer"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openrouter')}
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="openrouter">OpenRouter (Llama 3.1 Free)</option>
                </select>
              </div>

              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Jenis Dokumen</label>
                <select
                  className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue transition-all cursor-pointer"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                >
                  <option value="essay">Essay</option>
                  <option value="article">Artikel</option>
                  <option value="journal">Jurnal</option>
                  <option value="thesis">Thesis</option>
                </select>
              </div>

              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Panjang Artikel</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-md bg-write-bg2 border border-write-border cursor-pointer transition-all hover:bg-write-bg3 hover:border-write-border2 text-[13px] text-write-text">
                    <input
                      type="radio"
                      className="w-4 h-4 text-write-blue focus:ring-write-blue border-write-border"
                      name="length"
                      value="short"
                      checked={length === 'short'}
                      onChange={(e) => setLength('short')}
                    />
                    Pendek (1500-2000 kata)
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-md bg-write-bg2 border border-write-border cursor-pointer transition-all hover:bg-write-bg3 hover:border-write-border2 text-[13px] text-write-text">
                    <input
                      type="radio"
                      className="w-4 h-4 text-write-blue focus:ring-write-blue border-write-border"
                      name="length"
                      value="medium"
                      checked={length === 'medium'}
                      onChange={(e) => setLength('medium')}
                    />
                    Sedang (2500-3500 kata)
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-md bg-write-bg2 border border-write-border cursor-pointer transition-all hover:bg-write-bg3 hover:border-write-border2 text-[13px] text-write-text">
                    <input
                      type="radio"
                      className="w-4 h-4 text-write-blue focus:ring-write-blue border-write-border"
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

            <div className="p-4 px-6 border-t border-write-border flex justify-end gap-3 bg-write-bg2">
              <button className="p-2.5 px-5 rounded-md text-[14px] font-semibold cursor-pointer border border-write-border bg-write-bg text-write-text transition-all hover:bg-write-bg3" onClick={() => setShowAutoModal(false)}>
                Batal
              </button>
              <button
                className="p-2.5 px-5 rounded-md text-[14px] font-semibold cursor-pointer border-none transition-all flex items-center gap-2 bg-write-blue text-white hover:bg-write-blue2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] animate-in fade-in duration-200" onClick={() => setShowUpgradeModal(false)}>
          <div className="bg-write-bg rounded-xl w-full max-w-[650px] max-h-[90vh] overflow-hidden shadow-write-lg animate-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 px-6 border-b border-write-border bg-write-bg2">
              <h2 className="m-0 text-[18px] font-bold text-write-text">✨ Upgrade ke Pro</h2>
              <button className="w-8 h-8 flex items-center justify-center border-none bg-transparent rounded-md text-[20px] text-write-text cursor-pointer transition-colors hover:bg-write-bg3" onClick={() => setShowUpgradeModal(false)}>
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-left">
              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-4">Pilih Plan Terbaik Untukmu</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availablePlans.length > 0 ? (
                    availablePlans.map((plan) => (
                      <div
                        key={plan.planId}
                        className={`p-5 rounded-write border-2 transition-all cursor-pointer relative hover:shadow-md ${plan.planId === 'weekly-25k' ? 'border-write-blue bg-blue-50/10' : 'border-write-border bg-write-bg hover:border-write-blue'}`}
                        onClick={() => handleUpgrade(plan.planId)}
                      >
                        {plan.planId === 'weekly-25k' && <div className="absolute top-0 right-0 bg-write-blue text-white text-[10px] px-2 py-1 rounded-bl-write font-bold uppercase">Recommended</div>}
                        <div className="text-[16px] font-black text-write-text mb-1">{plan.name}</div>
                        <div className="text-[14px] font-bold text-write-blue mb-4">Rp {plan.price.toLocaleString('id-ID')}/{plan.durationDays} hari</div>
                        <ul className="flex flex-col gap-2 list-none p-0">
                          <li className="text-[12px] text-write-text2 flex items-center gap-2">
                             <span className="text-green-500 font-black">✓</span> Auto-generate: {plan.limits.autoGenerate === -1 ? 'Unlimited' : plan.limits.autoGenerate}x
                          </li>
                          <li className="text-[12px] text-write-text2 flex items-center gap-2">
                             <span className="text-green-500 font-black">✓</span> Prompt AI: {plan.limits.prompt === -1 ? 'Unlimited' : plan.limits.prompt}x
                          </li>
                          <li className="text-[12px] text-write-text2 flex items-center gap-2">
                             <span className="text-green-500 font-black">✓</span> Semua fitur AI Premium
                          </li>
                        </ul>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-10 text-write-text3">
                      Memuat plan...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-write-border flex justify-end gap-3 bg-write-bg2">
              <button className="p-2.5 px-5 rounded-md text-[14px] font-semibold cursor-pointer border border-write-border bg-write-bg text-write-text transition-all hover:bg-write-bg3" onClick={() => setShowUpgradeModal(false)}>
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Citation Modal */}
      {showCitationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] animate-in fade-in duration-200" onClick={() => setShowCitationModal(false)}>
          <div className="bg-write-bg rounded-xl w-full max-w-[500px] max-h-[90vh] overflow-hidden shadow-write-lg animate-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 px-6 border-b border-write-border bg-write-bg2">
              <h2 className="m-0 text-[18px] font-semibold text-write-text">Tambah Sitasi</h2>
              <button className="w-8 h-8 flex items-center justify-center border-none bg-transparent rounded-md text-[20px] text-write-text cursor-pointer transition-colors hover:bg-write-bg3" onClick={() => setShowCitationModal(false)}>
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-left">
              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Author *</label>
                <input
                  type="text"
                  className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue transition-all"
                  placeholder="Nama Penulis"
                  value={citationAuthor}
                  onChange={(e) => setCitationAuthor(e.target.value)}
                />
              </div>

              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Tahun *</label>
                <input
                  type="text"
                  className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue transition-all"
                  placeholder="2024"
                  value={citationYear}
                  onChange={(e) => setCitationYear(e.target.value)}
                />
              </div>

              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Sumber</label>
                <input
                  type="text"
                  className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue transition-all"
                  placeholder="Judul buku/jurnal"
                  value={citationSource}
                  onChange={(e) => setCitationSource(e.target.value)}
                />
              </div>

              <div className="mb-5 last:mb-0">
                <label className="block text-[13px] font-bold text-write-text2 mb-2">Teks Kutipan (opsional)</label>
                <textarea
                  className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue transition-all resize-none"
                  placeholder="Teks yang dikutip..."
                  value={citationText}
                  onChange={(e) => setCitationText(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="p-4 px-6 border-t border-write-border flex justify-end gap-3 bg-write-bg2">
              <button className="p-2.5 px-5 rounded-md text-[14px] font-semibold cursor-pointer border border-write-border bg-write-bg text-write-text transition-all hover:bg-write-bg3" onClick={() => setShowCitationModal(false)}>
                Batal
              </button>
              <button className="p-2.5 px-5 rounded-md text-[14px] font-bold bg-write-blue text-white hover:bg-write-blue2 shadow-sm transition-all" onClick={handleInsertCitation}>
                📚 Insert Sitasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] animate-in fade-in duration-200" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-write-bg rounded-xl w-full max-w-[450px] max-h-[90vh] overflow-hidden shadow-write-lg animate-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 px-6 border-b border-write-border bg-write-bg2">
              <h2 className="m-0 text-[18px] font-semibold text-write-text">⚙️ Pengaturan</h2>
              <button className="w-8 h-8 flex items-center justify-center border-none bg-transparent rounded-md text-[20px] text-write-text cursor-pointer transition-colors hover:bg-write-bg3" onClick={() => setShowSettingsModal(false)}>
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-left">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between mb-5 last:mb-0">
                <div className="flex flex-col gap-0.5">
                  <label className="block text-[14px] font-bold text-write-text m-0">🌙 Mode Gelap</label>
                  <div className="text-[11px] text-write-text3">Tampilan lebih nyaman di malam hari</div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 px-4 rounded-md text-[13px] font-bold transition-all border-none cursor-pointer ${darkMode ? 'bg-write-orange text-white' : 'bg-write-bg2 text-write-text hover:bg-write-bg3'}`}
                >
                  {darkMode ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {/* Ghost Text Toggle */}
              <div className="flex items-center justify-between mb-5 last:mb-0">
                <div className="flex flex-col gap-0.5">
                  <label className="block text-[14px] font-bold text-write-text m-0">👻 Saran AI (Ghost Text)</label>
                  <div className="text-[11px] text-write-text3">Tampilkan saran penulisan saat mengetik</div>
                </div>
                <button
                  onClick={() => setGhostEnabled(!ghostEnabled)}
                  className={`p-2 px-4 rounded-md text-[13px] font-bold transition-all border-none cursor-pointer ${ghostEnabled ? 'bg-green-500 text-white' : 'bg-write-bg2 text-write-text hover:bg-write-bg3'}`}
                >
                  {ghostEnabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {/* SFX Toggle */}
              <div className="flex items-center justify-between mb-5 last:mb-0">
                <div className="flex flex-col gap-0.5">
                  <label className="block text-[14px] font-bold text-write-text m-0">🔊 Efek Suara</label>
                  <div className="text-[11px] text-write-text3">Suara untuk milestone dan notifikasi</div>
                </div>
                <button
                  onClick={() => setSfxEnabled(!sfxEnabled)}
                  className={`p-2 px-4 rounded-md text-[13px] font-bold transition-all border-none cursor-pointer ${sfxEnabled ? 'bg-write-blue text-white' : 'bg-write-bg2 text-write-text hover:bg-write-bg3'}`}
                >
                  {sfxEnabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-write-border flex justify-end gap-3 bg-write-bg2">
              <button className="p-2.5 px-6 rounded-md text-[14px] font-bold bg-write-blue text-white hover:bg-write-blue2 shadow-sm transition-all cursor-pointer" onClick={() => setShowSettingsModal(false)}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}