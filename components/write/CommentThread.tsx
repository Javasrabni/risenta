'use client';

import { useState } from 'react';
import { Comment } from '@/types/collaboration';

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment: (content: string, selectionRange: any) => void;
  onReply: (parentId: string, content: string) => void;
  onResolve: (commentId: string) => void;
  canComment: boolean;
}

export default function CommentThread({
  comments,
  currentUserId,
  onAddComment,
  onReply,
  onResolve,
  canComment,
}: CommentThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  
  const toggleThread = (threadId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };
  
  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    onReply(parentId, replyContent);
    setReplyContent('');
    setReplyingTo(null);
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '💬';
    }
  };
  
  return (
    <div className="comment-thread">
      <div className="thread-header">
        <h3>Komentar ({comments.length})</h3>
      </div>
      
      {comments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>Belum ada komentar</p>
          {canComment && <p className="hint">Pilih teks untuk menambahkan komentar</p>}
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-item ${comment.status === 'resolved' ? 'resolved' : ''}`}
            >
              <div className="comment-header">
                <div className="user-info">
                  <div className="user-avatar">
                    {comment.userName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="user-name">{comment.userName}</span>
                  <span className="comment-date">
                    {new Date(comment.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="comment-actions">
                  <span className="status-icon">{getStatusIcon(comment.status)}</span>
                  {comment.userId === currentUserId && comment.status === 'open' && (
                    <button
                      className="resolve-btn"
                      onClick={() => onResolve(comment.id)}
                      title="Tandai selesai"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
              
              {comment.selectionRange?.selectedText && (
                <div className="quoted-text">
                  &ldquo;{comment.selectionRange.selectedText.substring(0, 100)}
                  {comment.selectionRange.selectedText.length > 100 ? '...' : ''}&rdquo;
                </div>
              )}
              
              <div className="comment-content">{comment.content}</div>
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="replies-section">
                  <button
                    className="toggle-replies"
                    onClick={() => toggleThread(comment.threadId || comment.id)}
                  >
                    {expandedThreads.has(comment.threadId || comment.id) ? '▾' : '▸'}
                    {comment.replyCount} balasan
                  </button>
                  
                  {expandedThreads.has(comment.threadId || comment.id) && (
                    <div className="replies-list">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="reply-item">
                          <div className="reply-header">
                            <span className="user-name">{reply.userName}</span>
                            <span className="reply-date">
                              {new Date(reply.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <div className="reply-content">{reply.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Reply input */}
              {canComment && comment.status === 'open' && (
                <div className="reply-section">
                  {replyingTo === comment.id ? (
                    <div className="reply-input">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Balas komentar..."
                        rows={2}
                      />
                      <div className="reply-actions">
                        <button
                          className="btn btn-sm"
                          onClick={() => setReplyingTo(null)}
                        >
                          Batal
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyContent.trim()}
                        >
                          Kirim
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="reply-btn"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      Balas
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .comment-thread {
          padding: 16px;
          background: var(--bg2);
          border-radius: 8px;
          min-width: 280px;
          max-width: 320px;
        }
        
        .thread-header {
          margin-bottom: 16px;
        }
        
        .thread-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }
        
        .empty-state {
          text-align: center;
          padding: 32px 16px;
          color: var(--text2);
        }
        
        .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        
        .empty-state p {
          margin: 0;
          font-size: 13px;
        }
        
        .hint {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 4px;
        }
        
        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .comment-item {
          padding: 12px;
          background: var(--bg);
          border-radius: 8px;
          border-left: 3px solid var(--blue);
        }
        
        .comment-item.resolved {
          border-left-color: #22c55e;
          opacity: 0.7;
        }
        
        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--blue);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
        }
        
        .user-name {
          font-size: 12px;
          font-weight: 600;
        }
        
        .comment-date {
          font-size: 11px;
          color: var(--text2);
        }
        
        .comment-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .status-icon {
          font-size: 14px;
        }
        
        .resolve-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          color: var(--green);
          cursor: pointer;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .resolve-btn:hover {
          background: var(--bg2);
        }
        
        .quoted-text {
          font-size: 12px;
          color: var(--text2);
          background: var(--bg2);
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 8px;
          font-style: italic;
          border-left: 2px solid var(--border);
        }
        
        .comment-content {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
        }
        
        .replies-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        
        .toggle-replies {
          font-size: 12px;
          color: var(--blue);
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .replies-list {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .reply-item {
          padding: 8px;
          background: var(--bg2);
          border-radius: 6px;
          margin-left: 16px;
        }
        
        .reply-header {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .reply-header .user-name {
          font-size: 11px;
        }
        
        .reply-date {
          font-size: 10px;
          color: var(--text2);
        }
        
        .reply-content {
          font-size: 12px;
        }
        
        .reply-section {
          margin-top: 12px;
        }
        
        .reply-btn {
          font-size: 12px;
          color: var(--blue);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        
        .reply-btn:hover {
          text-decoration: underline;
        }
        
        .reply-input {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .reply-input textarea {
          padding: 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          background: var(--bg2);
          color: var(--text);
          resize: vertical;
        }
        
        .reply-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .btn {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          border: none;
        }
        
        .btn-sm {
          padding: 4px 10px;
          font-size: 11px;
        }
        
        .btn-primary {
          background: var(--blue);
          color: white;
        }
      `}</style>
    </div>
  );
}
