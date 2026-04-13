// Collaboration Types

export interface Collaborator {
  id: string;
  userId: string;
  userType: 'customer' | 'admin';
  userName: string;
  userAvatar?: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  invitedBy: string;
  invitedAt: Date;
  lastAccessedAt: Date;
  isActive: boolean;
}

export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  userType: 'customer' | 'admin';
  userName: string;
  userAvatar?: string;
  selectionRange: {
    startOffset: number;
    endOffset: number;
    selectedText: string;
    nodePath?: string;
  };
  content: string;
  type: 'comment' | 'suggestion' | 'approval';
  status: 'open' | 'resolved' | 'rejected';
  threadId?: string;
  parentId?: string;
  replyCount: number;
  replies?: Comment[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  content: string;
  changes: {
    operation: 'insert' | 'delete' | 'format' | 'replace';
    position: number;
    text?: string;
    length?: number;
    userId: string;
    userName: string;
    timestamp: Date;
  }[];
  authorId: string;
  authorName: string;
  authorType: 'customer' | 'admin';
  wordCount: number;
  charCount: number;
  changeSummary: string;
  isAutoSnapshot: boolean;
  parentVersionId?: string;
  createdAt: Date;
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  userId: string;
  userType: 'customer' | 'admin';
  userName: string;
  userAvatar?: string;
  userColor: string;
  cursorPosition?: {
    anchor: number;
    head: number;
  };
  selection?: {
    start: number;
    end: number;
    text?: string;
  };
  lastSeenAt: Date;
  isActive: boolean;
  joinedAt: Date;
}

export interface CollaborationSettings {
  isCollaborative: boolean;
  allowComments: boolean;
  allowSuggestions: boolean;
  defaultRole: 'editor' | 'viewer' | 'commenter';
  maxCollaborators: number;
  requireApproval: boolean;
}

// Socket Events
export interface ServerToClientEvents {
  'doc:sync': (data: { content: string; version: number; users: CollaborationSession[] }) => void;
  'doc:update': (update: Uint8Array) => void;
  'user:joined': (user: CollaborationSession) => void;
  'user:left': (userId: string) => void;
  'cursor:updated': (data: { userId: string; userName: string; userColor: string; cursorPosition: CollaborationSession['cursorPosition'] }) => void;
  'selection:updated': (data: { userId: string; selection: CollaborationSession['selection'] }) => void;
  'awareness:update': (data: { userId: string; userColor: string; userName: string }) => void;
  'comment:added': (comment: Comment) => void;
  'comment:updated': (comment: Comment) => void;
  'comment:resolved': (commentId: string) => void;
  'version:snapshot': (version: DocumentVersion) => void;
  'error': (error: { message: string; code: string }) => void;
}

export interface ClientToServerEvents {
  'doc:join': (data: { documentId: string; userId: string; userType: string; userName: string }) => void;
  'doc:leave': (data: { documentId: string }) => void;
  'doc:update': (data: { documentId: string; update: Uint8Array }) => void;
  'cursor:update': (data: { documentId: string; cursorPosition: CollaborationSession['cursorPosition'] }) => void;
  'selection:update': (data: { documentId: string; selection: CollaborationSession['selection'] }) => void;
  'comment:add': (data: { documentId: string; comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'> }) => void;
  'comment:resolve': (data: { documentId: string; commentId: string }) => void;
  'version:create': (data: { documentId: string; manual: boolean }) => void;
}

// User colors for cursors
export const USER_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#65a30d', // Lime
  '#7c3aed', // Violet
  '#0d9488', // Teal
];

export function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}
