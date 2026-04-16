'use client';

import { useState } from 'react';
import { Collaborator, CollaborationSession } from '@/types/collaboration';

interface CollaborationPanelProps {
  collaborators: Collaborator[];
  activeUsers: CollaborationSession[];
  isOwner: boolean;
  myRole: string;
  onInviteClick: () => void;
  onRemoveCollaborator: (id: string) => void;
}

export default function CollaborationPanel({
  collaborators,
  activeUsers,
  isOwner,
  myRole,
  onInviteClick,
  onRemoveCollaborator,
}: CollaborationPanelProps) {
  const [showOffline, setShowOffline] = useState(false);
  
  // Merge collaborators with active sessions
  const allUsers = collaborators.map((collab) => {
    const activeSession = activeUsers.find(
      (u) => u.userId === collab.userId && u.userType === collab.userType
    );
    return {
      ...collab,
      isOnline: !!activeSession,
      userColor: activeSession?.userColor,
      userName: activeSession?.userName || collab.userId,
    };
  });
  
  const onlineUsers = allUsers.filter((u) => u.isOnline);
  const offlineUsers = allUsers.filter((u) => !u.isOnline);
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return '👑';
      case 'editor':
        return '✏️';
      case 'commenter':
        return '💬';
      case 'viewer':
        return '👁️';
      default:
        return '👤';
    }
  };
  
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'commenter':
        return 'Commenter';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };
  
  return (
    <div className="p-4 bg-write-bg2 rounded-lg min-w-[250px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-[14px] font-semibold text-write-text">Kolaborator</h3>
        {(isOwner || myRole === 'editor') && (
          <button className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold bg-write-blue text-white hover:bg-write-blue2 transition-colors cursor-pointer" onClick={onInviteClick}>
            + Undang
          </button>
        )}
      </div>
      
      {/* Online Users */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-[12px] text-write-text2 mb-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" /> Sedang Online ({onlineUsers.length})
        </div>
        {onlineUsers.length === 0 ? (
          <div className="text-[12px] text-write-text3 text-center p-3">Tidak ada user online</div>
        ) : (
          <div className="flex flex-col gap-2">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-md transition-colors duration-200 hover:bg-write-bg3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[14px] font-semibold text-center"
                  style={{ backgroundColor: user.userColor || '#2563eb' }}
                >
                  {user.userName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[13px] font-medium text-write-text flex items-center gap-1.5">
                    {user.userName}
                    {user.role === 'owner' && <span className="text-[10px] px-1.5 py-0.5 bg-write-blue text-white rounded font-black">Anda</span>}
                  </div>
                  <div className="text-[11px] text-write-text2 mt-0.5">
                    {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                  </div>
                </div>
                {isOwner && user.role !== 'owner' && (
                  <button
                    className="w-6 h-6 flex items-center justify-center border-none bg-transparent text-write-text3 cursor-pointer rounded transition-colors hover:bg-write-bg3 hover:text-red-500"
                    onClick={() => onRemoveCollaborator(user.id)}
                    title="Hapus kolaborator"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Offline Users */}
      {offlineUsers.length > 0 && (
        <div className="mb-4">
          <button
            className="flex items-center gap-2 text-[12px] text-write-text2 bg-transparent border-none cursor-pointer py-1"
            onClick={() => setShowOffline(!showOffline)}
          >
            <span className={`transition-transform duration-200 text-[8px] ${showOffline ? 'rotate-90' : ''}`}>▶</span>
            Offline ({offlineUsers.length})
          </button>
          {showOffline && (
            <div className="flex flex-col gap-2 mt-2">
              {offlineUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-md transition-colors duration-200 hover:bg-write-bg3 opacity-70">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[14px] font-semibold bg-write-text3/50 text-center">
                    {user.userName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[13px] font-medium text-write-text">{user.userName}</div>
                    <div className="text-[11px] text-write-text2 mt-0.5">
                      {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      className="w-6 h-6 flex items-center justify-center border-none bg-transparent text-write-text3 cursor-pointer rounded transition-colors hover:bg-write-bg3 hover:text-red-500"
                      onClick={() => onRemoveCollaborator(user.id)}
                      title="Hapus kolaborator"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
