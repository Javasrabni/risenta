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
  Columns, LetterText,
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
}
// Stable user color palette
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
  myRole,
  onRefreshUsage,
  tokenUsage,
}: TiptapWriteEditorProps) {
  // ── Yjs doc and provider are completely stable per component mount ──
  const [yDoc] = useState(() => new Y.Doc());

  const [provider] = useState(() => {
    if (typeof window === 'undefined') return null as unknown as WebsocketProvider;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const endpoint = `${protocol}//${window.location.host}/api/write/collaboration/yjs`;
    return new WebsocketProvider(endpoint, documentId || 'default', yDoc, {
      connect: false, // Wait until useEffect to actually connect
    });
  });

  const yProviderRef = useRef<WebsocketProvider | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [selectionState, setSelectionState] = useState<{ from: number; to: number; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // AI Prompt bar state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiGenerationProgress, setAiGenerationProgress] = useState('');
  const aiPromptRef = useRef<HTMLInputElement>(null);

  // Auto-generate state
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState({ label: '', percent: 0 });

  // Font size state
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

  // Multi-page tracking
  const [pageCount, setPageCount] = useState(1);

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

  // ── Tiptap Editor with Yjs Collaboration ──
  const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Disable history — Collaboration has its own undo manager
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
          HTMLAttributes: { class: 'editor-image' },
          allowBase64: true,
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: { class: 'editor-table' },
        }),
        TableRow,
        TableCell,
        TableHeader,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'editor-link' },
        }),
      ],
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: 'write-editor tiptap-editor',
          spellcheck: 'true',
        },
      },
      onUpdate: ({ editor: e }) => {
        const html = e.getHTML();
        debouncedPersist(html);
      },
    });

  // ── y-websocket connection lifecycle ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!documentId) return;

    // Boot the y-websocket server-side handler
    fetch('/api/write/collaboration/yjs').catch(() => undefined);

    yProviderRef.current = provider;

    // Connect the socket securely now that we're mounted
    provider.connect();

    const handleStatus = (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setSyncStatus(event.status);
      if (event.status === 'connected') {
        console.log('[Yjs] Connected to room:', documentId);
      }
    };

    provider.on('status', handleStatus);

    return () => {
      provider.off('status', handleStatus);
      provider.disconnect();
    };
  }, [documentId, provider]);

  // ── Awareness updates (runs without disconnecting the socket) ──
  useEffect(() => {
    if (!provider) return;
    provider.awareness.setLocalStateField('user', {
      name: userName || 'Anonymous',
      color: getUserColorFromId(userId || 'anon'),
      userType: userType || 'guest',
    });
  }, [provider, userName, userId, userType]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      yProviderRef.current?.destroy();
      yDoc.destroy();
    };
  }, [yDoc]);

  const hasSeeded = useRef(false);

  // ── Smart Data Seeding Strategy ──
  useEffect(() => {
    if (!editor || !activeDoc || hasSeeded.current) return;
    
    // If not collaborative at all, seed immediately
    if (!isCollaborative) {
      const target = activeDoc.content || '<p><br></p>';
      if (editor.getHTML() !== target) {
        editor.commands.setContent(target, false);
      }
      hasSeeded.current = true;
      return;
    }

    // If collaborative, wait until sync is established to avoid overwriting remote data.
    if (isCollaborative && provider) {
      const handleSync = (isSynced: boolean) => {
        if (isSynced && !hasSeeded.current) {
          // Native way to check if Yjs document is literally empty (no history or remote content)
          const yXml = provider.doc.getXmlFragment('default');
          if (yXml.length === 0 && editor.getText().trim() === '') {
            // CRITICAL: emitUpdate MUST be false to prevent cursor reset on remote clients.
            // Yjs Collaboration extension will handle broadcasting the change via CRDT sync.
            // CRITICAL: emitUpdate=false to prevent cursor reset on remote clients.
            // Yjs Collaboration extension handles broadcasting via CRDT sync.
            editor.commands.setContent(activeDoc.content || '<p><br></p>', false);
          }
          hasSeeded.current = true;
          provider.off('sync', handleSync); // Destroy listener immediately
        }
      };

      if (provider.synced) {
        handleSync(true);
      } else {
        provider.on('sync', handleSync);
      }
    }
    // We intentionally OMIT activeDoc.content from deps to absolutely prevent reactivity loops!
  }, [editor, activeDoc?.id, isCollaborative, provider]);

  // ── Selection tracking for inline AI / comments ──
  useEffect(() => {
    if (!editor) return;
    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelectionState((prev) => (prev === null ? null : null));
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

  // ── Auto-generate callback bridge ──
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

  // ── Inline AI actions ──
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
  }, [editor, selectionState, aiProvider]);

  // ── Parse margin commands (e.g. "4x4x3x3") ──
  const parseMarginKeywords = useCallback((prompt: string): { top: number; right: number; bottom: number; left: number } | null => {
    const lowerPrompt = prompt.toLowerCase();
    // Pattern: "4x4x4x4" (top, left, bottom, right)
    const xMatch = lowerPrompt.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (xMatch) {
      return { top: parseFloat(xMatch[1]), left: parseFloat(xMatch[2]), bottom: parseFloat(xMatch[3]), right: parseFloat(xMatch[4]) };
    }
    return null;
  }, []);

  // ── AI Canvas Generate (bottom prompt bar) ──
  const handleAICanvasGenerate = useCallback(async () => {
    if (!editor || !aiPrompt.trim()) return;
    const prompt = aiPrompt.trim();

    // Handle margin commands locally (no API call needed)
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

      // Handle quota exceeded
      if (!data.success && response.status === 403) {
        const event = new CustomEvent('showUpgradeModal');
        window.dispatchEvent(event);
        return;
      }

      if (data.success && data.content) {
        // Append generated content at the end
        editor.commands.focus('end');
        editor.commands.insertContent(data.content);
        setAiPrompt('');
        // Update stats
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
  }, [editor, aiPrompt, aiProvider, activeDoc, updateDocument, parseMarginKeywords, onRefreshUsage]);

  // ── Auto-Generate Full Document ──
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
      // Animate progress steps
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

      // Continue animation while waiting
      setAutoGenProgress(steps[3]);
      const data = await response.json();

      if (!data.success && response.status === 403) {
        const event = new CustomEvent('showUpgradeModal');
        window.dispatchEvent(event);
        setIsAutoGenerating(false);
        return;
      }

      if (data.success && data.content) {
        setAutoGenProgress(steps[4]);
        await new Promise(r => setTimeout(r, 500));

        // Typing animation — insert content progressively
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
          // Small delay between chunks for typing effect
          await new Promise(r => setTimeout(r, 50));
        }

        setAutoGenProgress(steps[6]);
        await new Promise(r => setTimeout(r, 400));

        // Update stats
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
  }, [editor, aiProvider, activeDoc, updateDocument, isAutoGenerating, onRefreshUsage]);

  // ── Multi-page: Track content height and calculate page count ──
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const contentHeight = entry.contentRect.height;
        const ps = activeDoc?.pageSettings || DEFAULT_PAGE_SETTINGS;
        const sizeP = PAGE_SIZES[ps.size] || PAGE_SIZES.a4;
        // Convert cm to px (approx 37.8px per cm)
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

  // ── Comment actions ──
  const handleAddComment = useCallback(async () => {
    if (!selectionState || !commentDraft.trim()) return;
    await commentsHook.addComment(commentDraft, {
      startOffset: selectionState.from,
      endOffset: selectionState.to,
      selectedText: selectionState.text,
    });
    setCommentDraft('');
  }, [selectionState, commentDraft, commentsHook]);

  // ── Toolbar helpers ──
  const isActive = useCallback((nameOrAttrs: string | Record<string, unknown>, attrs?: Record<string, unknown>) => {
    if (typeof nameOrAttrs === 'string') {
      return editor?.isActive(nameOrAttrs, attrs) ?? false;
    }
    return editor?.isActive(nameOrAttrs) ?? false;
  }, [editor]);

  // ── Page dimensions ──
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
  const TEXT_COLORS = [
    '#000000', '#434343', '#666666', '#999999',
    '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
    '#0891b2', '#2563eb', '#7c3aed', '#db2777',
  ];
  const HIGHLIGHT_COLORS = [
    'transparent', '#fef08a', '#bbf7d0', '#bfdbfe',
    '#e9d5ff', '#fecaca', '#fed7aa', '#d1fae5',
  ];

  return (
    <div className="editor-panel">
      {/* ── Google Docs-like Toolbar ── */}
      <div className="gdocs-toolbar" role="toolbar" aria-label="Formatting toolbar">
        {/* Undo / Redo */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Heading Dropdown */}
        <div className="toolbar-group" style={{ position: 'relative' }}>
          <button
            type="button"
            className="toolbar-btn toolbar-dropdown-btn"
            onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
            title="Paragraph style"
          >
            <Type size={14} />
            <span className="toolbar-dropdown-label">
              {isActive('heading', { level: 1 }) ? 'Heading 1' :
               isActive('heading', { level: 2 }) ? 'Heading 2' :
               isActive('heading', { level: 3 }) ? 'Heading 3' : 'Normal'}
            </span>
            <ChevronDown size={12} />
          </button>
          {showHeadingDropdown && (
            <div className="toolbar-dropdown-menu" onMouseLeave={() => setShowHeadingDropdown(false)}>
              <button type="button" onClick={() => { editor?.chain().focus().setParagraph().run(); setShowHeadingDropdown(false); }}>
                Normal text
              </button>
              <button type="button" onClick={() => { editor?.chain().focus().toggleHeading({ level: 1 }).run(); setShowHeadingDropdown(false); }} style={{ fontSize: 20, fontWeight: 700 }}>
                Heading 1
              </button>
              <button type="button" onClick={() => { editor?.chain().focus().toggleHeading({ level: 2 }).run(); setShowHeadingDropdown(false); }} style={{ fontSize: 16, fontWeight: 600 }}>
                Heading 2
              </button>
              <button type="button" onClick={() => { editor?.chain().focus().toggleHeading({ level: 3 }).run(); setShowHeadingDropdown(false); }} style={{ fontSize: 14, fontWeight: 600 }}>
                Heading 3
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-divider" />

        {/* Font Size */}
        <div className="toolbar-group" style={{ position: 'relative' }}>
          <button
            type="button"
            className="toolbar-btn toolbar-fontsize-btn"
            onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
            title="Font size"
          >
            <span>{currentFontSize}</span>
            <ChevronDown size={10} />
          </button>
          {showFontSizeDropdown && (
            <div className="toolbar-dropdown-menu toolbar-fontsize-menu" onMouseLeave={() => setShowFontSizeDropdown(false)}>
              {FONT_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  className={currentFontSize === size ? 'active' : ''}
                  onClick={() => {
                    setCurrentFontSize(size);
                    // Apply font size via inline style through TextStyle
                    editor?.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
                    setShowFontSizeDropdown(false);
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="toolbar-divider" />

        {/* Text Formatting */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${isActive('bold') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive('italic') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive('underline') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive('strike') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Text Color */}
        <div className="toolbar-group" style={{ position: 'relative' }}>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
            title="Text color"
          >
            <Palette size={16} />
          </button>
          {showColorPicker && (
            <div className="toolbar-color-picker" onMouseLeave={() => setShowColorPicker(false)}>
              {TEXT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className="color-swatch"
                  style={{ background: color }}
                  onClick={() => {
                    editor?.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight Color */}
        <div className="toolbar-group" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`toolbar-btn ${isActive('highlight') ? 'active' : ''}`}
            onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
            title="Highlight"
          >
            <Highlighter size={16} />
          </button>
          {showHighlightPicker && (
            <div className="toolbar-color-picker" onMouseLeave={() => setShowHighlightPicker(false)}>
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className="color-swatch"
                  style={{ background: color === 'transparent' ? '#f3f4f6' : color, border: color === 'transparent' ? '2px dashed #d1d5db' : 'none' }}
                  onClick={() => {
                    if (color === 'transparent') {
                      editor?.chain().focus().unsetHighlight().run();
                    } else {
                      editor?.chain().focus().toggleHighlight({ color }).run();
                    }
                    setShowHighlightPicker(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="toolbar-divider" />

        {/* Sub / Superscript */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${isActive('subscript') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleSubscript().run()}
            title="Subscript"
          >
            <SubIcon size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive('superscript') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleSuperscript().run()}
            title="Superscript"
          >
            <SupIcon size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Alignment */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            title="Align left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            title="Align center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            title="Align right"
          >
            <AlignRight size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
            title="Justify"
          >
            <AlignJustify size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Lists */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive('taskList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            title="Checklist"
          >
            <CheckSquare size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Block Elements */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${isActive('blockquote') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Block quote"
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-btn ${isActive('codeBlock') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            <Code size={16} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            <Minus size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Insert: Table, Image, Link */}
        <div className="toolbar-group">
          {/* Insert Table */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => { setShowTableMenu(!showTableMenu); setShowLineSpacingMenu(false); setShowFontFamilyMenu(false); }}
              title="Insert Table"
            >
              <TableIcon size={16} />
            </button>
            {showTableMenu && (
              <div className="toolbar-table-menu" onMouseLeave={() => setShowTableMenu(false)}>
                <button onClick={() => { editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(); setShowTableMenu(false); }}>
                  2 × 2 Table
                </button>
                <button onClick={() => { editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setShowTableMenu(false); }}>
                  3 × 3 Table
                </button>
                <button onClick={() => { editor?.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run(); setShowTableMenu(false); }}>
                  4 × 4 Table
                </button>
                <button onClick={() => { editor?.chain().focus().insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run(); setShowTableMenu(false); }}>
                  5 × 5 Table
                </button>
                {editor?.isActive('table') && (
                  <>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                    <button onClick={() => { editor?.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}>
                      + Add Column
                    </button>
                    <button onClick={() => { editor?.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}>
                      + Add Row
                    </button>
                    <button onClick={() => { editor?.chain().focus().deleteColumn().run(); setShowTableMenu(false); }} style={{ color: 'var(--red)' }}>
                      − Delete Column
                    </button>
                    <button onClick={() => { editor?.chain().focus().deleteRow().run(); setShowTableMenu(false); }} style={{ color: 'var(--red)' }}>
                      − Delete Row
                    </button>
                    <button onClick={() => { editor?.chain().focus().deleteTable().run(); setShowTableMenu(false); }} style={{ color: 'var(--red)' }}>
                      ✕ Delete Table
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Insert Image */}
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => {
              const url = prompt('Masukkan URL gambar:');
              if (url) {
                editor?.chain().focus().setImage({ src: url }).run();
              }
            }}
            title="Insert Image"
          >
            <ImageIcon size={16} />
          </button>

          {/* Insert/Toggle Link */}
          <button
            type="button"
            className={`toolbar-btn ${isActive('link') ? 'active' : ''}`}
            onClick={() => {
              if (isActive('link')) {
                editor?.chain().focus().unsetLink().run();
                return;
              }
              const url = prompt('Masukkan URL:');
              if (url) {
                editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
              }
            }}
            title={isActive('link') ? 'Remove Link' : 'Insert Link'}
          >
            <LinkIcon size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Line Spacing */}
        <div className="toolbar-group">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => { setShowLineSpacingMenu(!showLineSpacingMenu); setShowTableMenu(false); setShowFontFamilyMenu(false); }}
              title="Line Spacing"
              style={{ display: 'flex', alignItems: 'center', gap: '2px', width: 'auto', padding: '0 6px' }}
            >
              <LetterText size={14} />
              <span style={{ fontSize: '10px' }}>{currentLineSpacing}</span>
            </button>
            {showLineSpacingMenu && (
              <div className="toolbar-linespacing-menu" onMouseLeave={() => setShowLineSpacingMenu(false)}>
                {['1', '1.15', '1.5', '2', '2.5', '3'].map(spacing => (
                  <button
                    key={spacing}
                    className={currentLineSpacing === spacing ? 'active' : ''}
                    onClick={() => {
                      setCurrentLineSpacing(spacing);
                      // Apply via CSS attribute
                      const editorEl = document.querySelector('.tiptap-editor') as HTMLElement;
                      if (editorEl) editorEl.style.lineHeight = spacing;
                      setShowLineSpacingMenu(false);
                    }}
                  >
                    {spacing}× Spasi
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-divider" />

        {/* Font Family */}
        <div className="toolbar-group">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => { setShowFontFamilyMenu(!showFontFamilyMenu); setShowTableMenu(false); setShowLineSpacingMenu(false); }}
              title="Font Family"
              style={{ display: 'flex', alignItems: 'center', gap: '2px', width: 'auto', padding: '0 6px', fontSize: '11px', minWidth: '56px' }}
            >
              <span>{currentFontFamily === 'serif' ? 'Serif' : currentFontFamily === 'mono' ? 'Mono' : 'Sans'}</span>
              <ChevronDown size={10} />
            </button>
            {showFontFamilyMenu && (
              <div className="toolbar-fontfamily-menu" onMouseLeave={() => setShowFontFamilyMenu(false)}>
                <button
                  className={currentFontFamily === 'sans' ? 'active' : ''}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  onClick={() => {
                    editor?.chain().focus().setFontFamily('Inter, system-ui, sans-serif').run();
                    setCurrentFontFamily('sans');
                    setShowFontFamilyMenu(false);
                  }}
                >
                  Sans (Inter)
                </button>
                <button
                  className={currentFontFamily === 'serif' ? 'active' : ''}
                  style={{ fontFamily: 'Lora, Georgia, serif' }}
                  onClick={() => {
                    editor?.chain().focus().setFontFamily('Lora, Georgia, serif').run();
                    setCurrentFontFamily('serif');
                    setShowFontFamilyMenu(false);
                  }}
                >
                  Serif (Lora)
                </button>
                <button
                  className={currentFontFamily === 'mono' ? 'active' : ''}
                  style={{ fontFamily: 'Fira Code, monospace' }}
                  onClick={() => {
                    editor?.chain().focus().setFontFamily('Fira Code, monospace').run();
                    setCurrentFontFamily('mono');
                    setShowFontFamilyMenu(false);
                  }}
                >
                  Mono (Fira Code)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-divider" />

        {/* Clear Formatting */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear formatting"
          >
            <RemoveFormatting size={16} />
          </button>
        </div>

        {/* Right side: Comments toggle & Sync Status */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isCollaborative && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '12px',
                backgroundColor: syncStatus === 'connected' ? '#dcfce7' : syncStatus === 'connecting' ? '#fef08a' : '#fee2e2',
                color: syncStatus === 'connected' ? '#166534' : syncStatus === 'connecting' ? '#854d0e' : '#991b1b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              title={`Connection Status: ${syncStatus}`}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: syncStatus === 'connected' ? '#22c55e' : syncStatus === 'connecting' ? '#eab308' : '#ef4444',
                  animation: syncStatus === 'connecting' ? 'pulse 1s infinite' : 'none'
                }}
              />
              {syncStatus}
            </div>
          )}

          {onToggleComments && (
            <button
              type="button"
              className={`toolbar-btn ${showComments ? 'active' : ''}`}
              onClick={onToggleComments}
              title={showComments ? 'Sembunyikan Komentar' : 'Komentar'}
            >
              <MessageSquare size={16} />
              <span className="toolbar-btn-label">Komentar</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Editor Canvas Area ── */}
      <div className="editor-scroll">
        {/* Auto-Generate Overlay */}
        {isAutoGenerating && (
          <div className="autogen-overlay">
            <div className="autogen-card">
              <div className="autogen-spinner" />
              <h3 className="autogen-title">🤖 Chi Auto-Generate</h3>
              <p className="autogen-step">{autoGenProgress.label}</p>
              <div className="autogen-progress-track">
                <div className="autogen-progress-bar" style={{ width: `${autoGenProgress.percent}%` }} />
              </div>
              <span className="autogen-percent">{autoGenProgress.percent}%</span>
            </div>
          </div>
        )}

        <div className="pages-wrapper">
          <div
            className={`page page-${pageSettings.size}`}
            ref={containerRef}
            style={{ ...pageStyle, position: 'relative' }}
          >
            <EditorContent editor={editor} className="editor-content" />

            {/* Bubble Menu for Inline AI */}
            {editor && (
              <BubbleMenu
                editor={editor}
                className="bubble-ai-menu"
              >
                <button type="button" onClick={() => handleInlineAI('improve')} disabled={isAIProcessing}>
                  <Sparkles size={13} /> Improve
                </button>
                <button type="button" onClick={() => handleInlineAI('paraphrase')} disabled={isAIProcessing}>
                  Paraphrase
                </button>
                <button type="button" onClick={() => handleInlineAI('summarize')} disabled={isAIProcessing}>
                  Summarize
                </button>
                <button type="button" onClick={() => handleInlineAI('expand')} disabled={isAIProcessing}>
                  Expand
                </button>
                <button type="button" onClick={() => handleInlineAI('shorten')} disabled={isAIProcessing}>
                  Shorten
                </button>
                {canComment && selectionState && (
                  <button type="button" onClick={() => setCommentDraft(selectionState.text)} disabled={isAIProcessing}>
                    <MessageSquare size={13} /> Comment
                  </button>
                )}
                {isAIProcessing && <Loader2 size={14} className="ai-spinner" />}
              </BubbleMenu>
            )}

            {/* Comment Draft Panel (when user selects text + clicks Comment) */}
            {canComment && commentDraft && selectionState && (
              <div className="comment-draft-panel">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={3}
                  placeholder="Tulis komentar..."
                />
                <div className="comment-draft-actions">
                  <button type="button" className="btn btn-sm" onClick={() => setCommentDraft('')}>Batal</button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleAddComment}>Simpan</button>
                </div>
              </div>
            )}

            {/* Comments Panel */}
            {showComments && canComment && (
              <div className="comments-panel-float">
                <CommentThread
                  comments={commentsHook.comments}
                  currentUserId={userId || ''}
                  onAddComment={() => {}}
                  onReply={commentsHook.addReply}
                  onResolve={commentsHook.resolveComment}
                  canComment={canComment}
                />
              </div>
            )}
          </div>

          {/* Visual Page Break Lines — OUTSIDE the page div to avoid Tiptap DOM conflicts */}
          {pageCount > 1 && Array.from({ length: pageCount - 1 }, (_, i) => {
            const ps = activeDoc?.pageSettings || DEFAULT_PAGE_SETTINGS;
            const sizeP = PAGE_SIZES[ps.size] || PAGE_SIZES.a4;
            const pageHeightPx = (ps.size === 'custom' ? (ps.customHeight || sizeP.height) : sizeP.height) * 37.8;
            const usableHeight = pageHeightPx - (ps.margins.top * 37.8) - (ps.margins.bottom * 37.8);
            return (
              <div key={`pb-${i}`} className="page-break-indicator" style={{ top: `${(i + 1) * usableHeight + (ps.margins.top * 37.8)}px`, position: 'absolute', left: 0, right: 0 }}>
                <span className="page-break-label">— Halaman {i + 2} —</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Canvas Prompt Bar with Chi AI ── */}
      <div className="canvas-prompt-bar">
        <div className="canvas-prompt-row">
          <div className="canvas-prompt-input-wrap">
            <input
              ref={aiPromptRef}
              type="text"
              className="canvas-prompt-input"
              placeholder="Buntu? Ketik instruksi ke Chi — mis: 'buatkan paragraf selanjutnya tentang dampak AI'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAICanvasGenerate();
                }
              }}
              disabled={isAIGenerating}
            />
            <button
              type="button"
              className="canvas-prompt-send"
              onClick={handleAICanvasGenerate}
              disabled={isAIGenerating || !aiPrompt.trim()}
              title="Generate dengan AI"
            >
              {isAIGenerating ? <Loader2 size={16} className="ai-spinner" /> : <Send size={16} />}
            </button>
          </div>
          {isAIGenerating && (
            <span style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Loader2 size={12} className="ai-spinner" /> Chi menulis...
            </span>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="canvas-prompt-suggestions">
          <button
            className="canvas-prompt-chip autogen-chip"
            onClick={() => {
              const topic = aiPrompt.trim() || activeDoc?.title || '';
              if (topic && topic !== 'Dokumen Tanpa Judul') {
                handleAutoGenerate(topic);
              } else {
                setAiPrompt('');
                aiPromptRef.current?.focus();
                aiPromptRef.current?.setAttribute('placeholder', 'Ketik topik untuk Auto-Generate (mis: "Dampak AI terhadap pendidikan")');
              }
            }}
            disabled={isAutoGenerating}
          >
            <span className="chip-icon">🚀</span> Auto Generate
          </button>
          <button className="canvas-prompt-chip" onClick={() => setAiPrompt('Rapihkan tata letak')}>
            <span className="chip-icon">📐</span> Rapihkan tata letak
          </button>
          <button className="canvas-prompt-chip" onClick={() => setAiPrompt('Atur margin 4x4x3x3')}>
            <span className="chip-icon">📏</span> Atur margin
          </button>
          <button className="canvas-prompt-chip" onClick={() => setAiPrompt('Buatkan Daftar Pustaka')}>
            <span className="chip-icon">📚</span> Daftar Pustaka
          </button>
          <button className="canvas-prompt-chip" onClick={() => setAiPrompt('Buatkan Footnote')}>
            <span className="chip-icon">📝</span> Footnote
          </button>
          <button className="canvas-prompt-chip" onClick={() => setAiPrompt('Buat kesimpulan')}>
            <span className="chip-icon">✨</span> Buat Kesimpulan
          </button>
          {pageCount > 1 && (
            <span className="canvas-prompt-chip" style={{ cursor: 'default', opacity: 0.7 }}>
              📄 {pageCount} halaman
            </span>
          )}

          {/* AI Usage Display */}
          {tokenUsage && (
            <div className="canvas-prompt-usage">
              <span className={`usage-badge ${tokenUsage.promptRemaining <= 1 ? 'low' : ''}`}>
                ✏️ {tokenUsage.promptRemaining === -1 ? '∞' : tokenUsage.promptRemaining}/{tokenUsage.promptTotal === -1 ? '∞' : tokenUsage.promptTotal} Prompt
              </span>
              <span className={`usage-badge ${tokenUsage.autoGenerateRemaining <= 0 ? 'low' : ''}`}>
                🚀 {tokenUsage.autoGenerateRemaining === -1 ? '∞' : tokenUsage.autoGenerateRemaining}/{tokenUsage.autoGenerateTotal === -1 ? '∞' : tokenUsage.autoGenerateTotal} Auto
              </span>
              <span className="usage-badge">
                📋 {tokenUsage.planName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
