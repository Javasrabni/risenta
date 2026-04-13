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
    <div className="collaboration-panel">
      <div className="collaboration-header">
        <h3>Kolaborator</h3>
        {(isOwner || myRole === 'editor') && (
          <button className="btn btn-sm btn-primary" onClick={onInviteClick}>
            + Undang
          </button>
        )}
      </div>
      
      {/* Online Users */}
      <div className="user-section">
        <div className="section-title">
          <span className="online-indicator" /> Sedang Online ({onlineUsers.length})
        </div>
        {onlineUsers.length === 0 ? (
          <div className="empty-state">Tidak ada user online</div>
        ) : (
          <div className="user-list">
            {onlineUsers.map((user) => (
              <div key={user.id} className="user-item online">
                <div
                  className="user-avatar"
                  style={{ backgroundColor: user.userColor || '#2563eb' }}
                >
                  {user.userName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {user.userName}
                    {user.role === 'owner' && <span className="owner-badge">Anda</span>}
                  </div>
                  <div className="user-role">
                    {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                  </div>
                </div>
                {isOwner && user.role !== 'owner' && (
                  <button
                    className="btn-icon"
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
        <div className="user-section">
          <button
            className="section-toggle"
            onClick={() => setShowOffline(!showOffline)}
          >
            <span className={`arrow ${showOffline ? 'open' : ''}`}>▶</span>
            Offline ({offlineUsers.length})
          </button>
          {showOffline && (
            <div className="user-list">
              {offlineUsers.map((user) => (
                <div key={user.id} className="user-item offline">
                  <div className="user-avatar gray">
                    {user.userName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.userName}</div>
                    <div className="user-role">
                      {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      className="btn-icon"
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
      
      <style jsx>{`
        .collaboration-panel {
          padding: 16px;
          background: var(--bg2);
          border-radius: 8px;
          min-width: 250px;
        }
        
        .collaboration-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .collaboration-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }
        
        .user-section {
          margin-bottom: 16px;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text2);
          margin-bottom: 8px;
        }
        
        .online-indicator {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
        }
        
        .section-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text2);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 0;
        }
        
        .arrow {
          transition: transform 0.2s;
        }
        
        .arrow.open {
          transform: rotate(90deg);
        }
        
        .user-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .user-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        
        .user-item:hover {
          background: var(--bg3);
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }
        
        .user-avatar.gray {
          background: var(--text3);
          opacity: 0.5;
        }
        
        .user-info {
          flex: 1;
          min-width: 0;
        }
        
        .user-name {
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .owner-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: var(--blue);
          color: white;
          border-radius: 4px;
        }
        
        .user-role {
          font-size: 11px;
          color: var(--text2);
          margin-top: 2px;
        }
        
        .btn-icon {
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          color: var(--text3);
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-icon:hover {
          background: var(--bg3);
          color: var(--red);
        }
        
        .empty-state {
          font-size: 12px;
          color: var(--text3);
          text-align: center;
          padding: 12px;
        }
      `}</style>
    </div>
  );
}
