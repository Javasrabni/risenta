'use client';

import { useState } from 'react';
import { CollaborationSettings } from '@/types/collaboration';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  settings: CollaborationSettings | null;
  isOwner: boolean;
  currentUserId?: string;
  collaborators: any[];
  onUpdateRole: (collaboratorId: string, role: string) => Promise<boolean>;
  onRemove: (collaboratorId: string) => Promise<boolean>;
  onUpdateSettings: (settings: Partial<CollaborationSettings>) => Promise<boolean>;
}

export default function ShareModal({
  isOpen,
  onClose,
  documentId,
  settings,
  isOwner,
  currentUserId,
  collaborators,
  onUpdateRole,
  onRemove,
  onUpdateSettings,
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'settings'>('share');
  
  const pendingCollaborators = collaborators?.filter((c) => c.role === 'pending') || [];
  const activeCollaborators = collaborators?.filter((c) => c.role !== 'pending') || [];
  
  const [localSettings, setLocalSettings] = useState({
    isCollaborative: settings?.isCollaborative ?? false,
    allowComments: settings?.allowComments ?? true,
    allowSuggestions: settings?.allowSuggestions ?? true,
    defaultRole: settings?.defaultRole ?? 'viewer',
    maxCollaborators: settings?.maxCollaborators ?? 20,
    requireApproval: settings?.requireApproval ?? false,
  });
  
  if (!isOpen) return null;
  
  if (!isOpen) return null;
  
  const handleSettingsChange = async (key: keyof typeof localSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    if (isOwner) {
      await onUpdateSettings({ [key]: value });
    }
  };
  
  const shareLink = `${window.location.origin}/write?shared=${documentId}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
  };
  
  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bagikan Dokumen</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            Undang Orang
          </button>
          {isOwner && (
            <button
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Pengaturan
            </button>
          )}
        </div>
        
        {activeTab === 'share' ? (
          <div className="tab-content">
            <div className="share-link-section" style={{ borderTop: 'none', paddingTop: 0, paddingBottom: 20 }}>
              <label>Link Publik Kolaborasi</label>
              <div className="link-input-group">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                />
                <button className="btn btn-secondary" onClick={copyLink}>
                  Salin
                </button>
              </div>
              <p className="setting-desc" style={{ marginTop: '8px', paddingLeft: 0 }}>
                Bagikan link ini kepada rekan Anda. Mereka akan diminta untuk bergabung saat membukanya.
              </p>
            </div>
            
            {isOwner && (
              <div className="collaborators-list">
                {pendingCollaborators.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--red)' }}>Menunggu Persetujuan ({pendingCollaborators.length})</h3>
                    {pendingCollaborators.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>{c.userName || `Pengguna ${c.userId.substring(0, 6)}`}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{c.role}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => onUpdateRole(c.id, localSettings.defaultRole || 'viewer')} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px' }}>Terima</button>
                          <button onClick={() => onRemove(c.id)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red)', border: '1px solid var(--red-bg)' }}>Tolak</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div>
                  <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Anggota Tim Aktif ({activeCollaborators.length})</h3>
                  {activeCollaborators.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text2)' }}>Belum ada anggota yang bergabung</p>
                  ) : (
                    activeCollaborators.map(c => {
                      const isMe = c.userId === currentUserId;
                      return (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>
                              {isMe ? 'Anda' : (c.userName || (c.role === 'owner' ? 'Pemilik' : `Pengguna ${c.userId.substring(0, 6)}`))}
                              {isMe && c.role === 'owner' && ' (Pemilik)'}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text2)', textTransform: 'capitalize' }}>{c.role}</p>
                          </div>
                          {(isOwner && !isMe) && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <select 
                                value={c.role} 
                                onChange={(e) => onUpdateRole(c.id, e.target.value)}
                                style={{ padding: '4px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)' }}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                              </select>
                              <button onClick={() => onRemove(c.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>×</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            
          </div>
        ) : (
          <div className="tab-content settings-tab">
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.isCollaborative}
                  onChange={(e) => handleSettingsChange('isCollaborative', e.target.checked)}
                />
                <span className="toggle-text">Aktifkan kolaborasi</span>
              </label>
              <p className="setting-desc">Izinkan orang lain mengakses dokumen ini</p>
            </div>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.allowComments}
                  onChange={(e) => handleSettingsChange('allowComments', e.target.checked)}
                />
                <span className="toggle-text">Izinkan komentar</span>
              </label>
              <p className="setting-desc">Kolaborator dapat menambahkan komentar</p>
            </div>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.allowSuggestions}
                  onChange={(e) => handleSettingsChange('allowSuggestions', e.target.checked)}
                />
                <span className="toggle-text">Izinkan saran</span>
              </label>
              <p className="setting-desc">Kolaborator dapat mengusulkan perubahan</p>
            </div>
            
            <div className="setting-item">
              <label>Default Role</label>
              <select
                value={localSettings.defaultRole}
                onChange={(e) => handleSettingsChange('defaultRole', e.target.value)}
              >
                <option value="viewer">Viewer - Hanya melihat</option>
                <option value="commenter">Commenter - Melihat & komentar</option>
                <option value="editor">Editor - Edit penuh</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Maksimum Kolaborator</label>
              <input
                type="number"
                min={1}
                max={50}
                value={localSettings.maxCollaborators}
                onChange={(e) => handleSettingsChange('maxCollaborators', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .share-modal {
          background: var(--bg);
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: none;
          font-size: 20px;
          cursor: pointer;
          border-radius: 6px;
          color: var(--text);
        }
        
        .close-btn:hover {
          background: var(--bg2);
        }
        
        .modal-tabs {
          display: flex;
          gap: 4px;
          padding: 0 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .tab {
          padding: 12px 16px;
          border: none;
          background: none;
          color: var(--text2);
          cursor: pointer;
          font-size: 14px;
          position: relative;
        }
        
        .tab.active {
          color: var(--blue);
        }
        
        .tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--blue);
        }
        
        .tab-content {
          padding: 20px;
        }
        
        .invite-form {
          margin-bottom: 24px;
        }
        
        .input-group {
          display: flex;
          gap: 8px;
        }
        
        .input-group input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          background: var(--bg2);
          color: var(--text);
        }
        
        .input-group select {
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          background: var(--bg2);
          color: var(--text);
        }
        
        .btn {
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: opacity 0.2s;
        }
        
        .btn-primary {
          background: var(--blue);
          color: white;
        }
        
        .btn-secondary {
          background: var(--bg2);
          color: var(--text);
          border: 1px solid var(--border);
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .success-message {
          margin-top: 8px;
          padding: 8px 12px;
          background: #dcfce7;
          color: #166534;
          border-radius: 6px;
          font-size: 13px;
        }
        
        .share-link-section {
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }
        
        .share-link-section label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--text);
        }
        
        .link-input-group {
          display: flex;
          gap: 8px;
        }
        
        .link-input-group input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          background: var(--bg2);
          color: var(--text);
        }
        
        .settings-tab {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .setting-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .setting-item label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        
        .toggle-text {
          font-size: 14px;
        }
        
        .setting-desc {
          margin: 0;
          font-size: 12px;
          color: var(--text2);
          padding-left: 26px;
        }
        
        .setting-item select,
        .setting-item input[type="number"] {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          background: var(--bg2);
          color: var(--text);
          width: fit-content;
        }
      `}</style>
    </div>
  );
}
