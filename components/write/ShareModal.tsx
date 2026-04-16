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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-write-bg rounded-xl w-full max-w-[480px] max-h-[90vh] overflow-hidden shadow-write-lg animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 px-5 border-b border-write-border">
          <h2 className="m-0 text-[18px] font-semibold text-write-text">Bagikan Dokumen</h2>
          <button className="w-8 h-8 flex items-center justify-center border-none bg-transparent rounded-md text-[20px] text-write-text cursor-pointer transition-colors hover:bg-write-bg2" onClick={onClose}>×</button>
        </div>
        
        <div className="flex gap-1 p-0 px-5 border-b border-write-border">
          <button
            className={`px-4 py-3 border-none bg-transparent cursor-pointer text-[14px] relative transition-colors ${activeTab === 'share' ? 'text-write-blue after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-write-blue' : 'text-write-text2'}`}
            onClick={() => setActiveTab('share')}
          >
            Undang Orang
          </button>
          {isOwner && (
            <button
              className={`px-4 py-3 border-none bg-transparent cursor-pointer text-[14px] relative transition-colors ${activeTab === 'settings' ? 'text-write-blue after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-write-blue' : 'text-write-text2'}`}
              onClick={() => setActiveTab('settings')}
            >
              Pengaturan
            </button>
          )}
        </div>
        
        {activeTab === 'share' ? (
          <div className="p-5">
            <div className="pb-5">
              <label className="block text-[13px] font-medium mb-2 text-write-text">Link Publik Kolaborasi</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue"
                  value={shareLink}
                  readOnly
                />
                <button className="p-2 px-4 rounded-md text-[14px] cursor-pointer bg-write-bg2 text-write-text border border-write-border hover:bg-write-bg3 transition-colors shrink-0" onClick={copyLink}>
                  Salin
                </button>
              </div>
              <p className="mt-2 text-[12px] text-write-text2">
                Bagikan link ini kepada rekan Anda. Mereka akan diminta untuk bergabung saat membukanya.
              </p>
            </div>
            
            {isOwner && (
              <div className="flex flex-col">
                {pendingCollaborators.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-[14px] font-bold mb-2.5 text-red-500">Menunggu Persetujuan ({pendingCollaborators.length})</h3>
                    {pendingCollaborators.map(c => (
                      <div key={c.id} className="flex justify-between items-center p-2.5 border-b border-write-border">
                        <div className="text-left">
                          <p className="m-0 text-[13px] font-medium text-write-text">{c.userName || `Pengguna ${c.userId.substring(0, 6)}`}</p>
                          <p className="m-0 text-[12px] text-write-text2 capitalize">{c.role}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => onUpdateRole(c.id, localSettings.defaultRole || 'viewer')} className="p-2 px-3 rounded-md text-[12px] font-semibold bg-write-blue text-white hover:bg-write-blue2 transition-colors">Terima</button>
                          <button onClick={() => onRemove(c.id)} className="p-2 px-3 rounded-md text-[12px] font-semibold bg-write-bg2 text-red-500 border border-red-100 hover:bg-red-50 transition-colors">Tolak</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div>
                  <h3 className="text-[14px] font-bold mb-2.5 text-write-text">Anggota Tim Aktif ({activeCollaborators.length})</h3>
                  {activeCollaborators.length === 0 ? (
                    <p className="text-[13px] text-write-text2">Belum ada anggota yang bergabung</p>
                  ) : (
                    activeCollaborators.map(c => {
                      const isMe = c.userId === currentUserId;
                      return (
                        <div key={c.id} className="flex justify-between items-center p-2.5 border-b border-write-border">
                          <div className="text-left">
                            <p className="m-0 text-[13px] font-medium text-write-text">
                              {isMe ? 'Anda' : (c.userName || (c.role === 'owner' ? 'Pemilik' : `Pengguna ${c.userId.substring(0, 6)}`))}
                              {isMe && c.role === 'owner' && ' (Pemilik)'}
                            </p>
                            <p className="m-0 text-[12px] text-write-text2 capitalize">{c.role}</p>
                          </div>
                          {(isOwner && !isMe) && (
                            <div className="flex items-center gap-2">
                              <select 
                                className="p-1 px-2 text-[12px] border border-write-border rounded bg-write-bg text-write-text outline-none focus:border-write-blue"
                                value={c.role} 
                                onChange={(e) => onUpdateRole(c.id, e.target.value)}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                              </select>
                              <button onClick={() => onRemove(c.id)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors">×</button>
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
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-write-border text-write-blue focus:ring-write-blue"
                  checked={localSettings.isCollaborative}
                  onChange={(e) => handleSettingsChange('isCollaborative', e.target.checked)}
                />
                <span className="text-[14px] font-medium text-write-text">Aktifkan kolaborasi</span>
              </label>
              <p className="m-0 text-[12px] text-write-text2 pl-6.5">Izinkan orang lain mengakses dokumen ini</p>
            </div>
            
            <div className="flex flex-col gap-1.5 text-left">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-write-border text-write-blue focus:ring-write-blue"
                  checked={localSettings.allowComments}
                  onChange={(e) => handleSettingsChange('allowComments', e.target.checked)}
                />
                <span className="text-[14px] font-medium text-write-text">Izinkan komentar</span>
              </label>
              <p className="m-0 text-[12px] text-write-text2 pl-6.5">Kolaborator dapat menambahkan komentar</p>
            </div>
            
            <div className="flex flex-col gap-1.5 text-left">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-write-border text-write-blue focus:ring-write-blue"
                  checked={localSettings.allowSuggestions}
                  onChange={(e) => handleSettingsChange('allowSuggestions', e.target.checked)}
                />
                <span className="text-[14px] font-medium text-write-text">Izinkan saran</span>
              </label>
              <p className="m-0 text-[12px] text-write-text2 pl-6.5">Kolaborator dapat mengusulkan perubahan</p>
            </div>
            
            <div className="flex flex-col gap-2 text-left">
              <label className="text-[13px] font-bold text-write-text">Default Role</label>
              <select
                className="w-full p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue"
                value={localSettings.defaultRole}
                onChange={(e) => handleSettingsChange('defaultRole', e.target.value)}
              >
                <option value="viewer">Viewer - Hanya melihat</option>
                <option value="commenter">Commenter - Melihat & komentar</option>
                <option value="editor">Editor - Edit penuh</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2 text-left">
              <label className="text-[13px] font-bold text-write-text">Maksimum Kolaborator</label>
              <input
                type="number"
                className="w-24 p-2.5 px-3 border border-write-border rounded-md text-[14px] bg-write-bg2 text-write-text outline-none focus:border-write-blue"
                min={1}
                max={50}
                value={localSettings.maxCollaborators}
                onChange={(e) => handleSettingsChange('maxCollaborators', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
