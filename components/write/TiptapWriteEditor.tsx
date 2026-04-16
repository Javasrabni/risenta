'use client';

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { DEFAULT_PAGE_SETTINGS, Document, PAGE_SIZES } from '@/types/write';
import { calculateStats, debounce } from '@/lib/writeUtils';
import { useComments } from '@/hooks/useComments';
import CommentThread from './CommentThread';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare,
  Quote, Code, Minus,
  Undo2, Redo2,
  Highlighter, Type, Palette,
  MessageSquare, Sparkles, Send, ChevronDown,
  Subscript as SubIcon, Superscript as SupIcon,
  RemoveFormatting, Loader2,
  Image as ImageIcon, Table as TableIcon, Link as LinkIcon,
  LetterText,
} from 'lucide-react';

interface TiptapWriteEditorProps {
  activeDoc?: Document;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  isCollaborative: boolean;
  documentId?: string;
  aiProvider: 'gemini' | 'openrouter';
  userId?: string;
  userType?: string;
  userName?: string;
  canComment?: boolean;
  showComments?: boolean;
  onToggleComments?: () => void;
  onAutoGenerate?: (callback: (content: string, topic: string) => void) => void;
  onSetAIGenerating?: (callback: (isGenerating: boolean) => void) => void;
  myRole?: 'owner' | 'editor' | 'commenter' | 'viewer' | 'pending';
  onRefreshUsage?: () => void;
  tokenUsage?: { promptRemaining: number; promptTotal: number; autoGenerateRemaining: number; autoGenerateTotal: number; planName: string };
  onActiveUsersChange?: (users: any[]) => void;
}

const COLLAB_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea',
  '#ea580c', '#0891b2', '#db2777', '#65a30d',
  '#7c3aed', '#0d9488',
];

function getUserColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

export default function TiptapWriteEditor({
  activeDoc,
  updateDocument,
  isCollaborative,
  documentId,
  aiProvider,
  userId,
  userType,
  userName,
  canComment = false,
  showComments = false,
  onToggleComments,
  onAutoGenerate,
  onSetAIGenerating,
  onRefreshUsage,
  tokenUsage,
  onActiveUsersChange,
}: TiptapWriteEditorProps) {
  const [yDoc] = useState(() => new Y.Doc());

  const [provider] = useState(() => {
    if (typeof window === 'undefined') return null as unknown as WebsocketProvider;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const endpoint = `${protocol}//${window.location.host}/api/write/collaboration/yjs`;
    return new WebsocketProvider(endpoint, documentId || 'default', yDoc, {
      connect: false,
    });
  });

  const yProviderRef = useRef<WebsocketProvider | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [selectionState, setSelectionState] = useState<{ from: number; to: number; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const aiPromptRef = useRef<HTMLInputElement>(null);

  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState({ label: '', percent: 0 });

  const [currentFontSize, setCurrentFontSize] = useState('14');
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);
  const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
  const [currentLineSpacing, setCurrentLineSpacing] = useState('1.5');
  const [currentFontFamily, setCurrentFontFamily] = useState('sans');

  const [pageCount, setPageCount] = useState(1);
  const [remoteCursors, setRemoteCursors] = useState<Record<number, any>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const commentsHook = useComments({
    documentId: documentId || '',
    enabled: !!documentId && !!canComment,
  });

  const debouncedPersist = useMemo(
    () =>
      debounce((content: string) => {
        if (!activeDoc) return;
        const stats = calculateStats(content);
        updateDocument(activeDoc.id, {
          content,
          wordCount: stats.words,
          charCount: stats.chars,
        });
      }, 300),
    [activeDoc, updateDocument]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Placeholder.configure({ placeholder: 'Mulai menulis di sini...' }),
      Collaboration.configure({
        document: yDoc,
        field: 'default',
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: userName || 'Anonymous',
          color: getUserColorFromId(userId || 'anon'),
          userType: userType || 'guest',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      FontFamily,
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-write' },
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'border-collapse border border-write-border w-full my-4' },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-write-blue underline cursor-pointer hover:text-write-blue2 transition-colors' },
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'outline-none p-0 w-full h-full text-[14px] leading-[1.5] text-write-text selection:bg-write-blue/20 prose prose-sm max-w-none',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      debouncedPersist(html);

      // Handle Typing state
      if (provider) {
        provider.awareness.setLocalStateField('isTyping', true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          provider.awareness.setLocalStateField('isTyping', false);
        }, 3000);
      }
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!documentId) return;

    fetch('/api/write/collaboration/yjs').catch(() => undefined);

    yProviderRef.current = provider;
    provider.connect();

    const handleStatus = (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setSyncStatus(event.status);
    };

    provider.on('status', handleStatus);

    return () => {
      provider.off('status', handleStatus);
      provider.disconnect();
    };
  }, [documentId, provider]);

  useEffect(() => {
    if (!provider) return;
    
    // Update local awareness with user info
    provider.awareness.setLocalStateField('user', {
      name: userName || 'Anonymous',
      color: getUserColorFromId(userId || 'anon'),
      userType: userType || 'guest',
    });

    // Listen for remote awareness changes (for mouse cursors)
    const handleUpdate = () => {
      const states = provider.awareness.getStates();
      const cursors: Record<number, any> = {};
      
      states.forEach((state, clientID) => {
        if (clientID === provider.awareness.clientID) return;
        if (state.user && state.mouse) {
          cursors[clientID] = {
            user: state.user,
            mouse: state.mouse,
            isTyping: !!state.isTyping,
          };
        }
      });
      
      setRemoteCursors(cursors);

      // Call onActiveUsersChange if provided
      if (onActiveUsersChange) {
        const activeUsersList = Array.from(states.values()).map(s => s.user).filter(Boolean);
        onActiveUsersChange(activeUsersList);
      }
    };

    provider.awareness.on('change', handleUpdate);
    return () => {
      provider.awareness.off('change', handleUpdate);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [provider, userName, userId, userType, onActiveUsersChange]);

  // ── Sync Text Cursor Label Visibility ──
  useEffect(() => {
    // We target the Tiptap cursor labels using their text content (user name)
    const labels = document.querySelectorAll('.collaboration-cursor__label');
    labels.forEach(label => {
      const name = label.textContent;
      const client = Object.values(remoteCursors).find(c => c.user.name === name);
      if (client) {
        // Only show text label IF user is typing
        (label as HTMLElement).style.opacity = client.isTyping ? '1' : '0';
        (label as HTMLElement).style.transform = client.isTyping ? 'translateY(0)' : 'translateY(5px)';
        (label as HTMLElement).style.pointerEvents = client.isTyping ? 'auto' : 'none';
        (label as HTMLElement).style.transition = 'all 0.2s ease-in-out';
      } else {
        // Fallback for current user or unknown - hide label
        (label as HTMLElement).style.opacity = '0';
      }
    });

    // Also hide the local (self) label which might appear briefly
    const myLabel = Array.from(labels).find(l => l.textContent === userName);
    if (myLabel) (myLabel as HTMLElement).style.opacity = '0';

  }, [remoteCursors, userName]);

  // ── Track Mouse Movements ──
  const lastMouseUpdate = useRef(0);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!provider || !workspaceRef.current) return;
    
    const now = Date.now();
    if (now - lastMouseUpdate.current < 50) return; // 20fps update
    
    const rect = workspaceRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left + workspaceRef.current.scrollLeft);
    const y = (e.clientY - rect.top + workspaceRef.current.scrollTop);
    
    // Horizontal percentage, vertical pixels (reliable for long docs)
    const xPct = (x / workspaceRef.current.scrollWidth) * 100;

    provider.awareness.setLocalStateField('mouse', { x: xPct, y: y });
    lastMouseUpdate.current = now;
  };

  const hasSeeded = useRef(false);

  useEffect(() => {
    if (!editor || !activeDoc || hasSeeded.current) return;
    
    if (!isCollaborative) {
      const target = activeDoc.content || '<p><br></p>';
      if (editor.getHTML() !== target) {
        editor.commands.setContent(target, false);
      }
      hasSeeded.current = true;
      return;
    }

    if (isCollaborative && provider) {
      const handleSync = (isSynced: boolean) => {
        if (isSynced && !hasSeeded.current) {
          const yXml = provider.doc.getXmlFragment('default');
          if (yXml.length === 0 && editor.getText().trim() === '') {
            editor.commands.setContent(activeDoc.content || '<p><br></p>', false);
          }
          hasSeeded.current = true;
          provider.off('sync', handleSync);
        }
      };

      if (provider.synced) {
        handleSync(true);
      } else {
        provider.on('sync', handleSync);
      }
    }
  }, [editor, activeDoc?.id, isCollaborative, provider]);

  useEffect(() => {
    if (!editor) return;
    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelectionState(null);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, ' ');
      setSelectionState({ from, to, text });
    };
    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !onAutoGenerate) return;
    onAutoGenerate((content) => {
      editor.commands.focus();
      editor.commands.setContent(content || '<p><br></p>', false);
      const html = editor.getHTML();
      if (activeDoc) {
        const stats = calculateStats(html);
        updateDocument(activeDoc.id, { content: html, wordCount: stats.words, charCount: stats.chars });
      }
    });
  }, [editor, onAutoGenerate, activeDoc, updateDocument]);

  useEffect(() => {
    if (!onSetAIGenerating) return;
    onSetAIGenerating(setIsAIProcessing);
  }, [onSetAIGenerating]);

  const handleInlineAI = useCallback(async (action: 'improve' | 'paraphrase' | 'summarize' | 'expand' | 'shorten') => {
    if (!editor || !selectionState) return;
    setIsAIProcessing(true);
    try {
      const aiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userType === 'guest' && userId) {
        aiHeaders['x-guest-id'] = userId;
        aiHeaders['x-guest-name'] = userName || 'Tamu';
      }
      
      const response = await fetch(aiProvider === 'gemini' ? '/api/write/gemini' : '/api/write/openrouter', {
        method: 'POST',
        credentials: 'include',
        headers: aiHeaders,
        body: JSON.stringify({ type: action, prompt: selectionState.text }),
      });
      const data = await response.json();
      if (!data.success || !data.content) return;
      editor.commands.insertContentAt({ from: selectionState.from, to: selectionState.to }, data.content);
      setSelectionState(null);
    } finally {
      setIsAIProcessing(false);
    }
  }, [editor, selectionState, aiProvider, userId, userName, userType]);

  const parseMarginKeywords = useCallback((prompt: string): { top: number; right: number; bottom: number; left: number } | null => {
    const lowerPrompt = prompt.toLowerCase();
    const xMatch = lowerPrompt.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (xMatch) {
      return { top: parseFloat(xMatch[1]), left: parseFloat(xMatch[2]), bottom: parseFloat(xMatch[3]), right: parseFloat(xMatch[4]) };
    }
    return null;
  }, []);

  const handleAICanvasGenerate = useCallback(async () => {
    if (!editor || !aiPrompt.trim()) return;
    const prompt = aiPrompt.trim();

    if (prompt.toLowerCase().includes('margin')) {
      const margins = parseMarginKeywords(prompt);
      if (margins && activeDoc) {
        updateDocument(activeDoc.id, {
          pageSettings: {
            ...(activeDoc.pageSettings || { size: 'a4', orientation: 'portrait', margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 } }),
            margins,
          }
        });
        setAiPrompt('');
        return;
      }
    }

    setIsAIGenerating(true);
    try {
      const currentContent = editor.getHTML();
      const aiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userType === 'guest' && userId) {
        aiHeaders['x-guest-id'] = userId;
        aiHeaders['x-guest-name'] = userName || 'Tamu';
      }
      const response = await fetch(aiProvider === 'gemini' ? '/api/write/gemini' : '/api/write/openrouter', {
        method: 'POST',
        credentials: 'include',
        headers: aiHeaders,
        body: JSON.stringify({
          type: 'canvas-prompt',
          prompt,
          currentContent: currentContent.slice(0, 2000),
        }),
      });
      const data = await response.json();

      if (!data.success && response.status === 403) {
        window.dispatchEvent(new CustomEvent('showUpgradeModal'));
        return;
      }

      if (data.success && data.content) {
        editor.commands.focus('end');
        editor.commands.insertContent(data.content);
        setAiPrompt('');
        const html = editor.getHTML();
        if (activeDoc) {
          const stats = calculateStats(html);
          updateDocument(activeDoc.id, { content: html, wordCount: stats.words, charCount: stats.chars });
        }
        onRefreshUsage?.();
      }
    } catch (error) {
      console.error('[AI Canvas] Generation error:', error);
    } finally {
      setIsAIGenerating(false);
    }
  }, [editor, aiPrompt, aiProvider, activeDoc, updateDocument, parseMarginKeywords, onRefreshUsage, userId, userName, userType]);

  const handleAutoGenerate = useCallback(async (topic: string) => {
    if (!editor || !topic.trim() || isAutoGenerating) return;
    setIsAutoGenerating(true);
    
    const steps = [
      { label: '📋 Menganalisis topik...', percent: 10 },
      { label: '🧠 Menyusun kerangka...', percent: 25 },
      { label: '✍️ Menulis pendahuluan...', percent: 40 },
      { label: '📝 Menulis isi utama...', percent: 60 },
      { label: '🔍 Menulis pembahasan...', percent: 75 },
      { label: '📚 Menyusun daftar pustaka...', percent: 85 },
      { label: '✨ Finalisasi dokumen...', percent: 95 },
    ];

    try {
      for (const step of steps.slice(0, 3)) {
        setAutoGenProgress(step);
        await new Promise(r => setTimeout(r, 800));
      }

      const autoHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userType === 'guest' && userId) {
        autoHeaders['x-guest-id'] = userId;
        autoHeaders['x-guest-name'] = userName || 'Tamu';
      }
      const response = await fetch(aiProvider === 'gemini' ? '/api/write/gemini' : '/api/write/openrouter', {
        method: 'POST',
        credentials: 'include',
        headers: autoHeaders,
        body: JSON.stringify({
          type: 'auto-generate',
          prompt: topic.trim(),
          template: activeDoc?.template || 'essay',
        }),
      });

      setAutoGenProgress(steps[3]);
      const data = await response.json();

      if (!data.success && response.status === 403) {
        window.dispatchEvent(new CustomEvent('showUpgradeModal'));
        setIsAutoGenerating(false);
        return;
      }

      if (data.success && data.content) {
        setAutoGenProgress(steps[4]);
        await new Promise(r => setTimeout(r, 500));

        const content = data.content;
        const chunks = content.split(/(?=<h[1-6])|(?=<p>)/gi).filter(Boolean);
        
        editor.commands.clearContent();
        setAutoGenProgress(steps[5]);
        
        for (let i = 0; i < chunks.length; i++) {
          editor.commands.insertContent(chunks[i]);
          setAutoGenProgress({
            label: `✍️ Menulis... (${Math.round(((i + 1) / chunks.length) * 100)}%)`,
            percent: 40 + Math.round((i / chunks.length) * 55),
          });
          await new Promise(r => setTimeout(r, 50));
        }

        setAutoGenProgress(steps[6]);
        await new Promise(r => setTimeout(r, 400));

        const html = editor.getHTML();
        if (activeDoc) {
          const stats = calculateStats(html);
          updateDocument(activeDoc.id, {
            content: html,
            title: activeDoc.title === 'Dokumen Tanpa Judul' ? topic.slice(0, 60) : activeDoc.title,
            wordCount: stats.words,
            charCount: stats.chars,
          });
        }
        onRefreshUsage?.();
      }
    } catch (error) {
      console.error('[Auto Generate] Error:', error);
    } finally {
      setIsAutoGenerating(false);
      setAutoGenProgress({ label: '', percent: 0 });
    }
  }, [editor, aiProvider, activeDoc, updateDocument, isAutoGenerating, onRefreshUsage, userId, userName, userType]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight = entry.contentRect.height;
        const ps = activeDoc?.pageSettings || DEFAULT_PAGE_SETTINGS;
        const sizeP = PAGE_SIZES[ps.size] || PAGE_SIZES.a4;
        const pageHeightPx = (ps.size === 'custom' ? (ps.customHeight || sizeP.height) : sizeP.height) * 37.8;
        const marginTopPx = ps.margins.top * 37.8;
        const marginBottomPx = ps.margins.bottom * 37.8;
        const usableHeight = pageHeightPx - marginTopPx - marginBottomPx;
        
        const pages = Math.max(1, Math.ceil(contentHeight / usableHeight));
        setPageCount(pages);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeDoc?.pageSettings]);

  const handleAddComment = useCallback(async () => {
    if (!selectionState || !commentDraft.trim()) return;
    await commentsHook.addComment(commentDraft, {
      startOffset: selectionState.from,
      endOffset: selectionState.to,
      selectedText: selectionState.text,
    });
    setCommentDraft('');
  }, [selectionState, commentDraft, commentsHook]);

  const isActive = useCallback((nameOrAttrs: string | Record<string, unknown>, attrs?: Record<string, unknown>) => {
    if (typeof nameOrAttrs === 'string') {
      return editor?.isActive(nameOrAttrs, attrs) ?? false;
    }
    return editor?.isActive(nameOrAttrs) ?? false;
  }, [editor]);

  const pageSettings = activeDoc?.pageSettings || DEFAULT_PAGE_SETTINGS;
  const sizePreset = PAGE_SIZES[pageSettings.size] || PAGE_SIZES.a4;
  const paperWidth = pageSettings.size === 'custom' ? (pageSettings.customWidth || sizePreset.width) : sizePreset.width;
  const paperHeight = pageSettings.size === 'custom' ? (pageSettings.customHeight || sizePreset.height) : sizePreset.height;
  const pageStyle: CSSProperties = {
    width: `${paperWidth}cm`,
    minHeight: `${paperHeight}cm`,
    paddingTop: `${pageSettings.margins.top}cm`,
    paddingRight: `${pageSettings.margins.right}cm`,
    paddingBottom: `${pageSettings.margins.bottom}cm`,
    paddingLeft: `${pageSettings.margins.left}cm`,
    boxSizing: 'border-box',
  };

  const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
  const TEXT_COLORS = ['#000000', '#434343', '#666666', '#999999', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777'];
  const HIGHLIGHT_COLORS = ['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecaca', '#fed7aa', '#d1fae5'];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-write-bg overflow-hidden font-sans">
      {/* Formatting Toolbar */}
      <div className="h-9 border-b border-write-border flex items-center px-2.5 gap-1 bg-write-bg select-none shrink-0 overflow-x-auto no-scrollbar" role="toolbar">
        <div className="flex items-center gap-0.5">
          <button type="button" className="h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 text-write-text3 hover:text-write-text disabled:opacity-30" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo"><Undo2 size={16} /></button>
          <button type="button" className="h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 text-write-text3 hover:text-write-text disabled:opacity-30" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo"><Redo2 size={16} /></button>
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="relative">
          <button type="button" className="h-7 px-2 flex items-center gap-1.5 rounded-write hover:bg-write-bg2 text-write-text3 hover:text-write-text" onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}>
            <Type size={14} /><span className="text-[11px] font-medium">{isActive('heading', { level: 1 }) ? 'H1' : isActive('heading', { level: 2 }) ? 'H2' : isActive('heading', { level: 3 }) ? 'H3' : 'Text'}</span><ChevronDown size={10} />
          </button>
          {showHeadingDropdown && (
            <div className="absolute top-full left-0 mt-1 min-w-[140px] bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] py-1 animate-in zoom-in-95" onMouseLeave={() => setShowHeadingDropdown(false)}>
              <button className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-write-bg2" onClick={() => { editor?.chain().focus().setParagraph().run(); setShowHeadingDropdown(false); }}>Normal</button>
              <button className="w-full px-3 py-1.5 text-left text-[13px] font-bold hover:bg-write-bg2" onClick={() => { editor?.chain().focus().toggleHeading({ level: 1 }).run(); setShowHeadingDropdown(false); }}>Heading 1</button>
              <button className="w-full px-3 py-1.5 text-left text-[13px] font-semibold hover:bg-write-bg2" onClick={() => { editor?.chain().focus().toggleHeading({ level: 2 }).run(); setShowHeadingDropdown(false); }}>Heading 2</button>
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="relative">
          <button type="button" className="h-7 px-1.5 flex items-center gap-1 rounded-write hover:bg-write-bg2 text-write-text3 hover:text-write-text" onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}>
            <span className="text-[11px] font-bold">{currentFontSize}</span><ChevronDown size={10} />
          </button>
          {showFontSizeDropdown && (
            <div className="absolute top-full left-0 mt-1 min-w-[60px] max-h-[200px] overflow-y-auto bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] py-1" onMouseLeave={() => setShowFontSizeDropdown(false)}>
              {FONT_SIZES.map(s => <button key={s} className="w-full px-2 py-1 text-[11px] hover:bg-write-bg2" onClick={() => { setCurrentFontSize(s); editor?.chain().focus().setMark('textStyle', { fontSize: `${s}px` }).run(); setShowFontSizeDropdown(false); }}>{s}</button>)}
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="flex items-center gap-0.5">
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('bold') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('italic') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('underline') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('strike') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></button>
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="relative">
          <button type="button" className="h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 text-write-text3" onClick={() => setShowColorPicker(!showColorPicker)}><Palette size={16} /></button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] grid grid-cols-4 gap-1.5" onMouseLeave={() => setShowColorPicker(false)}>
              {TEXT_COLORS.map(c => <button key={c} className="w-5 h-5 rounded-sm border border-black/5" style={{ background: c }} onClick={() => { editor?.chain().focus().setColor(c).run(); setShowColorPicker(false); }} />)}
            </div>
          )}
        </div>
        <div className="relative">
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('highlight') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => setShowHighlightPicker(!showHighlightPicker)}><Highlighter size={16} /></button>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] grid grid-cols-4 gap-1.5" onMouseLeave={() => setShowHighlightPicker(false)}>
              {HIGHLIGHT_COLORS.map(c => <button key={c} className="w-5 h-5 rounded-sm border border-black/5" style={{ background: c === 'transparent' ? '#fff' : c }} onClick={() => { c === 'transparent' ? editor?.chain().focus().unsetHighlight().run() : editor?.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlightPicker(false); }} />)}
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="flex items-center gap-0.5">
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive({ textAlign: 'left' }) ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive({ textAlign: 'center' }) ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive({ textAlign: 'right' }) ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive({ textAlign: 'justify' }) ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().setTextAlign('justify').run()}><AlignJustify size={16} /></button>
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="flex items-center gap-0.5">
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('bulletList') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('orderedList') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('taskList') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => editor?.chain().focus().toggleTaskList().run()}><CheckSquare size={16} /></button>
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="flex items-center gap-0.5">
          <div className="relative">
            <button type="button" className="h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 text-write-text3" onClick={() => setShowTableMenu(!showTableMenu)}><TableIcon size={16} /></button>
            {showTableMenu && (
              <div className="absolute top-full left-0 mt-1 min-w-[140px] bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] py-1 animate-in zoom-in-95" onMouseLeave={() => setShowTableMenu(false)}>
                <button className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-write-bg2" onClick={() => { editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setShowTableMenu(false); }}>Insert Table (3x3)</button>
                {editor?.isActive('table') && (
                  <>
                    <button className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-write-bg2" onClick={() => { editor?.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}>Add Column</button>
                    <button className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-write-bg2" onClick={() => { editor?.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}>Add Row</button>
                    <button className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-write-bg2 text-write-red" onClick={() => { editor?.chain().focus().deleteTable().run(); setShowTableMenu(false); }}>Delete Table</button>
                  </>
                )}
              </div>
            )}
          </div>
          <button type="button" className="h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 text-write-text3" onClick={() => { const u = prompt('URL:'); if (u) editor?.chain().focus().setImage({ src: u }).run(); }}><ImageIcon size={16} /></button>
          <button type="button" className={`h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 ${isActive('link') ? 'bg-write-bg2 text-write-blue' : 'text-write-text3'}`} onClick={() => { if (isActive('link')) return editor?.chain().focus().unsetLink().run(); const u = prompt('URL:'); if (u) editor?.chain().focus().setLink({ href: u }).run(); }}><LinkIcon size={16} /></button>
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <div className="relative">
          <button type="button" className="h-7 px-1.5 flex items-center gap-1 rounded-write hover:bg-write-bg2 text-write-text3" onClick={() => setShowLineSpacingMenu(!showLineSpacingMenu)}>
            <LetterText size={14} /><span className="text-[10px] font-bold">{currentLineSpacing}</span>
          </button>
          {showLineSpacingMenu && (
            <div className="absolute top-full left-0 mt-1 min-w-[80px] bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] py-1" onMouseLeave={() => setShowLineSpacingMenu(false)}>
              {['1', '1.15', '1.5', '2'].map(s => <button key={s} className="w-full px-2 py-1 text-[11px] hover:bg-write-bg2" onClick={() => { setCurrentLineSpacing(s); (document.querySelector('.ProseMirror') as HTMLElement).style.lineHeight = s; setShowLineSpacingMenu(false); }}>{s}x</button>)}
            </div>
          )}
        </div>
        <div className="relative">
          <button type="button" className="h-7 px-1.5 flex items-center gap-1 rounded-write hover:bg-write-bg2 text-write-text3" onClick={() => setShowFontFamilyMenu(!showFontFamilyMenu)}>
            <span className="text-[10px] font-bold uppercase">{currentFontFamily}</span><ChevronDown size={10} />
          </button>
          {showFontFamilyMenu && (
            <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-write-bg border border-write-border rounded-write shadow-write-lg z-[100] py-1 font-sans" onMouseLeave={() => setShowFontFamilyMenu(false)}>
              <button className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-write-bg2 font-sans" onClick={() => { editor?.chain().focus().setFontFamily('Inter, sans-serif').run(); setCurrentFontFamily('sans'); setShowFontFamilyMenu(false); }}>Sans (Inter)</button>
              <button className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-write-bg2 font-serif" onClick={() => { editor?.chain().focus().setFontFamily('Lora, serif').run(); setCurrentFontFamily('serif'); setShowFontFamilyMenu(false); }}>Serif (Lora)</button>
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-write-border mx-1" />
        <button type="button" className="h-7 w-7 flex items-center justify-center rounded-write hover:bg-write-bg2 text-write-text3" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting"><RemoveFormatting size={16} /></button>

        <div className="ml-auto flex items-center gap-3">
          {isCollaborative && (
            <div className={`flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border ${syncStatus === 'connected' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'connected' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
              {syncStatus}
            </div>
          )}
          {onToggleComments && (
            <button type="button" className={`h-7 px-2.5 flex items-center gap-1.5 rounded-write hover:bg-write-bg2 text-write-text3 ${showComments ? 'bg-write-bg2 text-write-blue font-bold' : ''}`} onClick={onToggleComments}>
              <MessageSquare size={14} /><span className="text-[11px] hidden sm:inline">Komentar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div 
        ref={workspaceRef}
        onMouseMove={handleMouseMove}
        className="flex-1 overflow-y-auto bg-write-bg2 flex flex-col items-center pt-8 pb-32 relative scroll-smooth selection:bg-write-blue/20"
      >
        {Object.entries(remoteCursors).map(([clientID, data]) => (
          !data.isTyping && (
            <div
              key={clientID}
              className="mouse-cursor animate-in fade-in duration-300"
              style={{
                left: `${data.mouse.x}%`,
                top: `${data.mouse.y}px`,
              }}
            >
              <svg className="mouse-cursor__icon" viewBox="0 0 24 24" fill={data.user.color || '#2563eb'}>
                <path d="M5.653 3.123l15.773 10.516a1 1 0 01-.227 1.838l-4.73 1.455 3.332 5.044a1 1 0 11-1.666 1.1l-3.332-5.043-3.21 3.555a1 1 0 01-1.745-.631l-.195-17.824a1 1 0 011.054-.954z" />
              </svg>
              <div 
                className="mouse-cursor-label"
                style={{ backgroundColor: data.user.color || '#2563eb' }}
              >
                {data.user.name}
              </div>
            </div>
          )
        ))}
        {isAutoGenerating && (
          <div className="fixed inset-0 z-[2000] bg-write-bg/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-write-bg border border-write-border rounded-write-lg p-8 shadow-write-lg text-center max-w-[320px] w-full animate-in zoom-in-95 duration-300">
              <div className="w-10 h-10 border-4 border-write-orange/20 border-t-write-orange rounded-full animate-spin mx-auto mb-5" />
              <h3 className="text-write-text font-bold text-[18px] mb-2 tracking-tight">🤖 Chi Auto-Generate</h3>
              <p className="text-write-text3 text-[14px] mb-5 font-medium">{autoGenProgress.label}</p>
              <div className="h-2.5 bg-write-bg2 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-write-orange transition-all duration-300" style={{ width: `${autoGenProgress.percent}%` }} />
              </div>
              <span className="text-[12px] font-bold text-write-orange">{autoGenProgress.percent}%</span>
            </div>
          </div>
        )}

        <div className="relative flex flex-col items-center gap-8 w-fit mx-auto">
          <div className={`bg-write-bg shadow-write flex flex-col transition-all duration-300 relative outline-none page-${pageSettings.size}`} ref={containerRef} style={{ ...pageStyle, minHeight: pageStyle.minHeight, height: 'auto' }}>
            <EditorContent editor={editor} className="w-full" />

            {editor && (
              <BubbleMenu editor={editor} className="flex items-center gap-1 p-1 bg-write-bg border border-write-border rounded-write shadow-write-lg animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-0.5 border-r border-write-border pr-1 mr-1">
                  <button type="button" className="h-7 px-2 flex items-center gap-1.5 text-[11px] font-bold text-write-blue hover:bg-write-bg2 rounded-write transition-colors disabled:opacity-50" onClick={() => handleInlineAI('improve')} disabled={isAIProcessing}><Sparkles size={12} /> Improve</button>
                </div>
                <div className="flex items-center gap-0.5">
                  <button type="button" className="h-7 px-2 text-[11px] font-medium text-write-text hover:bg-write-bg2 rounded-write" onClick={() => handleInlineAI('paraphrase')} disabled={isAIProcessing}>Paraphrase</button>
                  <button type="button" className="h-7 px-2 text-[11px] font-medium text-write-text hover:bg-write-bg2 rounded-write" onClick={() => handleInlineAI('summarize')} disabled={isAIProcessing}>Summarize</button>
                  <button type="button" className="h-7 px-2 text-[11px] font-medium text-write-text hover:bg-write-bg2 rounded-write" onClick={() => handleInlineAI('expand')} disabled={isAIProcessing}>Expand</button>
                </div>
                {canComment && selectionState && (
                  <div className="flex items-center gap-0.5 border-l border-write-border pl-1 ml-1">
                    <button type="button" className="h-7 px-2 flex items-center gap-1.5 text-[11px] font-medium text-write-orange hover:bg-write-bg2 rounded-write" onClick={() => setCommentDraft(selectionState.text)} disabled={isAIProcessing}><MessageSquare size={12} /> Comment</button>
                  </div>
                )}
                {isAIProcessing && <Loader2 size={12} className="animate-spin text-write-blue ml-1" />}
              </BubbleMenu>
            )}

            {canComment && commentDraft && selectionState && (
              <div className="absolute top-0 right-[-340px] w-[320px] bg-write-bg border border-write-border rounded-write-lg shadow-write-lg p-4 animate-in slide-in-from-left-4 duration-300 z-50">
                <div className="text-[11px] font-bold text-write-text3 mb-2 uppercase tracking-wider">Draft Komentar</div>
                <div className="text-[12px] text-write-text bg-write-bg2 p-2 rounded-write border border-write-border mb-3 italic line-clamp-3">"{selectionState.text}"</div>
                <textarea className="w-full bg-write-bg border border-write-border rounded-write p-2 text-[13px] text-write-text outline-none focus:border-write-blue min-h-[80px] resize-none" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Tulis komentar..." autoFocus />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button type="button" className="px-3 py-1.5 text-[12px] font-bold text-write-text3 hover:text-write-text" onClick={() => setCommentDraft('')}>Batal</button>
                  <button type="button" className="px-4 py-1.5 text-[12px] font-bold bg-write-blue text-white rounded-write hover:bg-write-blue2 shadow-sm" onClick={handleAddComment}>Kirim</button>
                </div>
              </div>
            )}

            {showComments && canComment && (
              <div className="absolute top-0 right-[-340px] w-[320px] h-full pointer-events-none z-40">
                <div className="sticky top-4 pointer-events-auto">
                  <CommentThread comments={commentsHook.comments} currentUserId={userId || ''} onAddComment={() => {}} onReply={commentsHook.addReply} onResolve={commentsHook.resolveComment} canComment={canComment} />
                </div>
              </div>
            )}
          </div>

          {pageCount > 1 && Array.from({ length: pageCount - 1 }, (_, i) => {
            const ps = activeDoc?.pageSettings || DEFAULT_PAGE_SETTINGS;
            const sizeP = PAGE_SIZES[ps.size] || PAGE_SIZES.a4;
            const pageHeightPx = (ps.size === 'custom' ? (ps.customHeight || sizeP.height) : sizeP.height) * 37.8;
            const usableHeight = pageHeightPx - (ps.margins.top * 37.8) - (ps.margins.bottom * 37.8);
            return (
              <div key={`pb-${i}`} className="absolute left-0 right-0 border-t border-write-border border-dashed pointer-events-none select-none flex items-center justify-center h-px" style={{ top: `${(i + 1) * usableHeight + (ps.margins.top * 37.8)}px` }}>
                <span className="bg-write-bg2 px-3 py-1 text-[10px] font-bold text-write-text3 rounded-full border border-write-border -translate-y-1/2">Halaman {i + 2}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Prompt Bottom Bar */}
      <div className="border-t border-write-border bg-write-bg p-3 px-6 shrink-0 z-10 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <input ref={aiPromptRef} type="text" className="w-full h-10 pl-4 pr-11 text-[13px] border border-write-border rounded-write-lg bg-write-bg2 text-write-text outline-none transition-all duration-200 focus:border-write-orange focus:ring-2 focus:ring-write-orange/10 focus:bg-write-bg placeholder:text-write-text3" placeholder="Tulis instruksi ke Chi... mis: 'buatkan paragraf penutup'" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAICanvasGenerate()} disabled={isAIGenerating} />
            <button type="button" className="absolute right-2 w-7 h-7 flex items-center justify-center rounded-write bg-write-orange text-white border-none transition-all duration-200 hover:bg-write-orange2 disabled:opacity-50 shadow-sm" onClick={handleAICanvasGenerate} disabled={isAIGenerating || !aiPrompt.trim()}><Send size={16} /></button>
          </div>
          {isAIGenerating && <span className="text-[11px] text-write-text3 whitespace-nowrap flex items-center gap-1 font-medium animate-pulse"><Loader2 size={12} className="animate-spin text-write-orange" /> Chi menulis...</span>}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <button className="h-7 px-3 py-1.25 rounded-full text-[11px] font-bold border bg-write-orange/10 text-write-orange border-write-orange/20 hover:bg-write-orange hover:text-white transition-all active:scale-95 flex items-center gap-1.5" onClick={() => handleAutoGenerate(aiPrompt || activeDoc?.title || '')} disabled={isAutoGenerating}><Sparkles size={12} /> Auto Generate</button>
          <button className="h-7 px-3 py-1.25 rounded-full text-[11px] font-medium border border-write-border bg-write-bg2 text-write-text3 hover:bg-white hover:text-write-text transition-all active:scale-95" onClick={() => setAiPrompt('Rapihkan tata letak')}>🎨 Rapihkan tata letak</button>
          <button className="h-7 px-3 py-1.25 rounded-full text-[11px] font-medium border border-write-border bg-write-bg2 text-write-text3 hover:bg-white hover:text-write-text transition-all active:scale-95" onClick={() => setAiPrompt('Buatkan Daftar Pustaka')}>📚 Daftar Pustaka</button>
          
          {tokenUsage && (
            <div className="ml-auto flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 bg-write-blue/10 text-write-blue border-write-blue/20`}>
                <div className="w-1.5 h-1.5 rounded-full bg-write-blue" />
                {tokenUsage.promptRemaining}/{tokenUsage.promptTotal} Prompt
              </div>
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-write-bg2 text-write-text3 border-write-border shadow-sm">🏆 {tokenUsage.planName}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
