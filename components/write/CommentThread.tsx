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
    <div className="p-4 bg-write-bg2 rounded-lg min-w-[280px] max-w-[320px]">
      <div className="mb-4">
        <h3 className="m-0 text-[14px] font-semibold text-write-text">Komentar ({comments.length})</h3>
      </div>
      
      {comments.length === 0 ? (
        <div className="text-center py-8 px-4 text-write-text2">
          <div className="text-[32px] mb-2">💬</div>
          <p className="m-0 text-[13px]">Belum ada komentar</p>
          {canComment && <p className="text-[12px] opacity-70 mt-1">Pilih teks untuk menambahkan komentar</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto text-left">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 bg-write-bg rounded-lg border-l-4 ${comment.status === 'resolved' ? 'border-l-green-500 opacity-70' : 'border-l-write-blue'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-write-blue text-white flex items-center justify-center text-[11px] font-semibold text-center">
                    {comment.userName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="text-[12px] font-semibold text-write-text">{comment.userName}</span>
                  <span className="text-[11px] text-write-text2">
                    {new Date(comment.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[14px]">{getStatusIcon(comment.status)}</span>
                  {comment.userId === currentUserId && comment.status === 'open' && (
                    <button
                      className="w-6 h-6 flex items-center justify-center border-none bg-transparent text-green-500 cursor-pointer rounded transition-colors hover:bg-write-bg2 text-[16px]"
                      onClick={() => onResolve(comment.id)}
                      title="Tandai selesai"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
              
              {comment.selectionRange?.selectedText && (
                <div className="text-[12px] text-write-text2 bg-write-bg2 p-2 rounded border-l-2 border-write-border mb-2 italic">
                  &ldquo;{comment.selectionRange.selectedText.substring(0, 100)}
                  {comment.selectionRange.selectedText.length > 100 ? '...' : ''}&rdquo;
                </div>
              )}
              
              <div className="text-[13px] leading-relaxed text-write-text">{comment.content}</div>
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-write-border">
                  <button
                    className="text-[12px] text-write-blue bg-transparent border-none cursor-pointer flex items-center gap-1 hover:underline"
                    onClick={() => toggleThread(comment.threadId || comment.id)}
                  >
                    {expandedThreads.has(comment.threadId || comment.id) ? '▾' : '▸'}
                    {comment.replyCount} balasan
                  </button>
                  
                  {expandedThreads.has(comment.threadId || comment.id) && (
                    <div className="mt-2 flex flex-col gap-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="p-2 bg-write-bg2 rounded-md ml-4 text-left">
                          <div className="flex gap-2 mb-1">
                            <span className="text-[11px] font-semibold text-write-text">{reply.userName}</span>
                            <span className="text-[10px] text-write-text2">
                              {new Date(reply.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <div className="text-[12px] text-write-text">{reply.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Reply input */}
              {canComment && comment.status === 'open' && (
                <div className="mt-3">
                  {replyingTo === comment.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="w-full p-2 border border-write-border rounded-md text-[13px] bg-write-bg2 text-write-text outline-none focus:border-write-blue resize-none"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Balas komentar..."
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer border border-write-border bg-write-bg text-write-text hover:bg-write-bg3"
                          onClick={() => setReplyingTo(null)}
                        >
                          Batal
                        </button>
                        <button
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer border-none transition-all bg-write-blue text-white hover:bg-write-blue2 shadow-sm disabled:opacity-50"
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyContent.trim()}
                        >
                          Kirim
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="text-[12px] text-write-blue bg-transparent border-none cursor-pointer p-0 hover:underline"
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
    </div>
  );
}
