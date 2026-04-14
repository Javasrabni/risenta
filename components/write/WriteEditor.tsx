'use client';


import { Document, ChiMood, PageSize, PageSettings, PAGE_SIZES, DEFAULT_PAGE_SETTINGS, AnalysisData, DocumentTemplate, DOCUMENT_TEMPLATES } from '@/types/write';
import { calculateStats, debounce, detectAIPatterns, detectPlagiarism } from '@/lib/writeUtils';
import { cacheDocument, getCachedDocument, getDraft, clearDraft } from '@/lib/documentCache';
import { useAutoSave } from '@/hooks/useAutoSave';
import AnalysisCanvas from './AnalysisCanvas';
import CommentThread from './CommentThread';
import { Eye, EyeOff, MessageSquare } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useComments } from '@/hooks/useComments';
import { Doc, Text, applyUpdate, encodeStateAsUpdate } from 'yjs';
import { getSocket, joinDocument, leaveDocument, sendDocumentUpdate, updateCursor, updateSelection } from '@/lib/socketClient';
import { diff_match_patch } from 'diff-match-patch';
import { MessageSquarePlus } from 'lucide-react';

const dmp = new diff_match_patch();

// Suggestion pool for ghost text
const suggPool: Record<string, string[]> = {
  essay: [
    "Hal ini membuktikan bahwa perubahan tidak selalu berjalan secara linear.",
    "Di sisi lain, terdapat argumen kuat yang mendukung pandangan sebaliknya.",
    "Berdasarkan analisis tersebut, kita dapat menarik beberapa kesimpulan penting.",
    "Lebih jauh, fenomena ini berdampak signifikan terhadap kehidupan sehari-hari.",
    "Maka dari itu, diperlukan pendekatan yang lebih holistik dan komprehensif."
  ],
  academic: [
    "Hasil penelitian ini konsisten dengan temuan yang dilaporkan oleh peneliti sebelumnya.",
    "Data menunjukkan adanya korelasi positif antara kedua variabel yang diteliti.",
    "Hal ini memberikan implikasi penting bagi pengembangan teori dan praktik.",
    "Keterbatasan penelitian ini perlu diperhatikan dalam interpretasi hasil.",
    "Penelitian lanjutan diperlukan untuk mengkonfirmasi temuan ini dalam konteks yang berbeda."
  ],
  blog: [
    "Bayangkan situasi berikut ini — apakah kamu pernah mengalaminya?",
    "Inilah mengapa hal ini penting bagi kehidupan kamu sehari-hari.",
    "Faktanya, banyak orang tidak menyadari dampak yang ditimbulkan.",
    "Namun ada kabar baik: ada cara sederhana untuk mengatasinya.",
    "Jadi, apa langkah konkret yang bisa kamu ambil mulai hari ini?"
  ],
  free: [
    "Namun, perlu dipertimbangkan juga sudut pandang yang berbeda.",
    "Dengan demikian, kita dapat melihat betapa pentingnya hal ini.",
    "Selain itu, faktor eksternal juga turut mempengaruhi situasi ini.",
    "Hal ini sejalan dengan apa yang sering kita temukan dalam kehidupan nyata.",
    "Oleh karena itu, langkah yang lebih proaktif sangat diperlukan."
  ]
};

// CHI_COMMENTS pool
const CHI_COMMENTS: Record<string, string[]> = {
  happy: ["Terus tulis! Lagi bagus nih ✦", "Ide-nya mengalir deras, pertahankan!", "Aku suka arah tulisanmu~", "Keren! Jangan sampai kehilangan momen ini."],
  bored: ["Hei, masih di sini? 👋", "Yuk lanjut, jangan sampai ide kabur!", "Chi lagi nunggu kamu nih...", "Coba tulis apa yang ada di pikiran dulu!"],
  sleeping: ["Zzz... *ngorok*", "💤 Bangunin aku kalau mau nulis lagi ya", "*tidur di atas tumpukan kertas*"],
  worried: ["Banyak typo nih, pelan-pelan aja!", "Santai, bisa dibenerin nanti kok~", "Jangan buru-buru ya, kualitas lebih penting."],
  shocked: ["Eh?! Teksnya kemana?!", "Dihapus semua?! Yakin nih?", "Mulai segar juga bagus kok, semangat!"],
  excited: ["WOW {w} kata! 🎉 Luar biasa!", "Terus!! {w} kata sudah, makin dekat ke target!", "Momentum-nya bagus banget sekarang!"],
  celebrating: ["🎊 {w} KATA!! LUAR BIASA BANGET!", "Aku bangga sama kamu! {w} kata itu keren!", "★ {w} kata! Kamu keren banget hari ini!"],
  thinking: ["Hmm, biar aku pikirin sebentar...", "Tunggu ya, lagi analisis tulisanmu~", "Sebentar ya..."],
  proud: ["Tulisanmu udah jauh lebih baik! ★", "Aku lihat perkembanganmu, keren banget!", "Ini hasil kerja kerasmu — bangga deh~"],
  welcome_back: ["Oh balik lagi! Yuk lanjut~", "Aku tahu kamu pasti balik! ✦", "Selamat datang kembali! Mana idemu tadi?"],
  para_done: ["Paragraf ini idenya kuat! Kembangkan lebih lanjut~", "Argumennya makin tajam nih, bagus!", "Aku suka cara kamu jelasin ini, natural banget~", "Transisi antar paragrafnya udah lumayan smooth!"]
};

interface WriteEditorProps {
  activeDoc?: Document;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  showFormatBar: boolean;
  chiMood: ChiMood;
  setChiMood: (mood: ChiMood) => void;
  setShowAutoModal: (show: boolean) => void;
  setShowCitationModal: (show: boolean) => void;
  aiProvider: 'gemini' | 'openrouter';
  onAutoGenerate?: (callback: (content: string, topic: string) => void) => void;
  onAutoSaveStatusChange?: (status: { isAutoSaving: boolean; lastSaved: Date | null }) => void;
  onSetAIGenerating?: (callback: (isGenerating: boolean) => void) => void;
  onSaveAnalysis?: (analysisData: AnalysisData) => void;
  // Collaboration props
  documentId?: string;
  userId?: string;
  userType?: string;
  userName?: string;
  canComment?: boolean;
  showComments?: boolean;
  onToggleComments?: () => void;
  isCollaborative?: boolean;
  myRole?: string;
  // Usage refresh callback
  onRefreshUsage?: () => void;
}

export default function WriteEditor({
  activeDoc,
  updateDocument,
  showFormatBar,
  chiMood,
  setChiMood,
  setShowAutoModal,
  setShowCitationModal,
  aiProvider,
  onAutoGenerate,
  onAutoSaveStatusChange,
  onSetAIGenerating,
  onSaveAnalysis,
  documentId,
  userId,
  userType,
  userName,
  canComment,
  showComments,
  onToggleComments,
  isCollaborative,
  myRole = 'owner',
  onRefreshUsage,
}: WriteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Yjs real-time collaboration state
  const yDocRef = useRef<Doc | null>(null);
  const yTextRef = useRef<Text | null>(null);
  const socketRef = useRef<any>(null);
  const isJoinedRef = useRef(false);
  const isRemoteUpdateRef = useRef(false); // Flag for applying socket updates
  const isLocalChangeRef = useRef(false);   // Flag for local typing sync
  const lastSyncContentRef = useRef<string>('');
  const [isCollaborationReady, setIsCollaborationReady] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<Array<{userId: string; userName: string; userColor: string; cursorPosition?: {anchor: number; head: number}}>>([]);
  const [content, setContent] = useState('');
  const [selection, setSelection] = useState<{ text: string; range?: Range } | null>(null);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPosition, setAIMenuPosition] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightMode, setHighlightMode] = useState<'none' | 'ai' | 'plagiarism'>('none');
  const [ghostText, setGhostText] = useState('');
  const [showGhost, setShowGhost] = useState(false);
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0 });
  const [lastCommentTime, setLastCommentTime] = useState(0);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [capturedSelection, setCapturedSelection] = useState<{ text: string; anchor: number; head: number } | null>(null);
  const isTypingLocallyRef = useRef(false);
  const lastTypingTimeRef = useRef(0);
  const editorSyncPausedRef = useRef(false);

  // Helper to get cursor offset in characters
  const getCursorOffset = useCallback((element: HTMLDivElement | null): number => {
    if (!element) return 0;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !element.contains(sel.anchorNode)) return 0;
    const range = sel.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  }, []);

  const setCursorOffset = useCallback((offset: number) => {
    if (!editorRef.current) return;
    const element = editorRef.current;
    const sel = window.getSelection();
    if (!sel) return;
    
    const range = document.createRange();
    let charCount = 0;
    const nodeStack: Node[] = [element];
    
    while (nodeStack.length > 0) {
      const node = nodeStack.pop()!;
      if (node.nodeType === 3) { // Text node
        const nextCharCount = charCount + (node.textContent?.length || 0);
        if (offset <= nextCharCount) {
          range.setStart(node, Math.max(0, offset - charCount));
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
        charCount = nextCharCount;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }
  }, []);
  
  // Comments hook
  const commentsHook = useComments({
    documentId: documentId || '',
    enabled: !!documentId, // Always enabled if we have a documentId
  });
  
  // Initialize Yjs document for real-time collaboration
  useEffect(() => {
    if (!isCollaborative || !documentId || !userId) return;
    
    // Create Yjs document
    yDocRef.current = new Doc();
    yTextRef.current = yDocRef.current.getText('content');
    
    // Listen for Yjs text changes (remote updates)
    yTextRef.current?.observe((event) => {
      // PREVENT FLICKER: If the user is typing, or has typed recently (last 2s),
      // do not touch the DOM at all. Let the local state stay as is.
      const now = Date.now();
      if (now - lastTypingTimeRef.current < 2000) return;
      if (editorSyncPausedRef.current) return;

      if (isRemoteUpdateRef.current || !isLocalChangeRef.current) {
        const newYContent = yTextRef.current?.toString() || '';
        const normalize = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/\uFEFF/g, '').replace(/\s+/g, ' ').trim();
        
        if (editorRef.current && normalize(editorRef.current.innerHTML) !== normalize(newYContent)) {
          console.log('[WriteEditor] Applying remote update');
          const offset = getCursorOffset(editorRef.current);
          
          requestAnimationFrame(() => {
            if (editorRef.current && Date.now() - lastTypingTimeRef.current >= 2000) {
               // Only apply if we are STILL in a non-typing state
               editorRef.current.innerHTML = newYContent;
               setContent(newYContent);
               setCursorOffset(offset);
            }
          });
        }
      }
    });
  }, [isCollaborative, documentId, userId, getCursorOffset, setCursorOffset]);

  // Setup socket connection
  useEffect(() => {
    if (!isCollaborative || !documentId || !userId) return;
    
    const socket = getSocket();
    socketRef.current = socket;
    
    if (!socket) {
      console.warn('[Collaboration] Socket not available');
      return;
    }
    
    socket.on('connect', () => {
      if (!isJoinedRef.current) {
        joinDocument(documentId, userId, userType || 'customer', userName || 'Anonymous');
        isJoinedRef.current = true;
        setIsCollaborationReady(true);
      }
    });
    
    socket.on('doc:sync', (data: any) => {
      // Initialize with server content
      const contentToApply = data.initialContent || data.content;
      if (yTextRef.current && contentToApply && yTextRef.current.length === 0) {
        yTextRef.current.insert(0, contentToApply);
        if (editorRef.current) {
          editorRef.current.innerHTML = contentToApply;
        }
      }
      
      // Apply binary update if present
      if (data.update && yDocRef.current) {
        isRemoteUpdateRef.current = true;
        applyUpdate(yDocRef.current, new Uint8Array(data.update));
        isRemoteUpdateRef.current = false;
      }
    });
    
    socket.on('doc:update', async (data: any) => {
      // Apply remote update
      const update = data.update || data; // Handle both raw and wrapped
      if (yDocRef.current && update) {
        isRemoteUpdateRef.current = true;
        applyUpdate(yDocRef.current, new Uint8Array(update));
        isRemoteUpdateRef.current = false;
        
        // Sync to editor
        const newContent = yTextRef.current?.toString() || '';
        if (editorRef.current && editorRef.current.innerHTML !== newContent) {
          editorRef.current.innerHTML = newContent;
        }
      }
    });
    
    (socket as any).on('cursor:update', (data: any) => {
      // Update remote user cursor and selection position
      setRemoteUsers(prev => {
        const existing = prev.find(u => u.userId === data.userId);
        const userData = {
          userId: data.userId,
          userName: data.userName || 'Unknown',
          userColor: data.userColor || '#2563eb',
          cursorPosition: data.cursorPosition
        };
        
        if (existing) {
          return prev.map(u => u.userId === data.userId ? userData : u);
        }
        return [...prev, userData];
      });
    });
    
    (socket as any).on('user:left', (leftUserId: string) => {
      setRemoteUsers(prev => prev.filter(u => u.userId !== leftUserId));
    });
    
    // If already connected
    if (socket.connected) {
      if (!isJoinedRef.current) {
        joinDocument(documentId, userId, userType || 'customer', userName || 'Anonymous');
        isJoinedRef.current = true;
        setIsCollaborationReady(true);
      }
    }
    
    return () => {
      if (documentId) {
        leaveDocument(documentId);
      }
      isJoinedRef.current = false;
      setIsCollaborationReady(false);
      
      if (socket) {
        const s = socket as any;
        s.off('connect');
        s.off('doc:sync');
        s.off('doc:update');
        s.off('users:list');
        s.off('user:joined');
        s.off('user:left');
        s.off('cursor:update');
        s.off('cursor:updated');
      }
    };
  }, [isCollaborative, documentId, userId, userType, userName]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastParaTextRef = useRef('');
  const paraReviewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [canvasPrompt, setCanvasPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const [showAnalysisCanvas, setShowAnalysisCanvas] = useState(false);
  const [analysisTopic, setAnalysisTopic] = useState('');
  const [analysisContent, setAnalysisContent] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const aiGeneratingOverlayRef = useRef<HTMLDivElement | null>(null);
  const aiGeneratingLabelRef = useRef<HTMLDivElement | null>(null);
  
  // Zoom state for workspace canvas
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  // Trigger AI generating animation overlay
  const triggerAIGeneratingAnimation = useCallback((isGenerating: boolean) => {
    const pageElement = document.querySelector('.page');
    
    if (isGenerating) {
      if (!pageElement) return;
      
      // Remove any existing overlay first
      if (aiGeneratingOverlayRef.current) {
        aiGeneratingOverlayRef.current.remove();
      }
      if (aiGeneratingLabelRef.current) {
        aiGeneratingLabelRef.current.remove();
      }
      
      // Create animation overlay
      const overlay = document.createElement('div');
      overlay.className = 'ai-generating-overlay';
      pageElement.appendChild(overlay);
      aiGeneratingOverlayRef.current = overlay;
      
      // Create label popup - append to page element so it follows scroll
      const label = document.createElement('div');
      label.className = 'ai-generating-label';
      label.textContent = 'AI sedang menganalisis & menulis...';
      pageElement.appendChild(label);
      aiGeneratingLabelRef.current = label;
      
      setChiMood({ type: 'thinking', comment: 'Sedang menganalisis topik dan menyusun tulisan...' });
    } else {
      // Remove animation elements
      if (aiGeneratingOverlayRef.current) {
        aiGeneratingOverlayRef.current.remove();
        aiGeneratingOverlayRef.current = null;
      }
      if (aiGeneratingLabelRef.current) {
        aiGeneratingLabelRef.current.remove();
        aiGeneratingLabelRef.current = null;
      }
    }
  }, [setChiMood]);

  // Register AI generating state callback
  useEffect(() => {
    if (onSetAIGenerating) {
      onSetAIGenerating(triggerAIGeneratingAnimation);
    }
  }, [onSetAIGenerating, triggerAIGeneratingAnimation]);

  // Cleanup AI generating animation on unmount
  useEffect(() => {
    return () => {
      if (aiGeneratingOverlayRef.current) {
        aiGeneratingOverlayRef.current.remove();
      }
      if (aiGeneratingLabelRef.current) {
        aiGeneratingLabelRef.current.remove();
      }
    };
  }, []);

  // Save analysis data to document
  const saveAnalysisToDocument = useCallback((analysisData: AnalysisData) => {
    if (!activeDoc) return;
    
    updateDocument(activeDoc.id, { analysisData });
    
    // Also call the onSaveAnalysis callback if provided
    onSaveAnalysis?.(analysisData);
  }, [activeDoc, updateDocument, onSaveAnalysis]);

  useEffect(() => {
    setMounted(true);

    // Use native event listeners to ensure scroll works after hydration
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      const handleWheel = (e: WheelEvent) => {
        e.stopPropagation();
      };
      const handleTouchMove = (e: TouchEvent) => {
        e.stopPropagation();
      };

      scrollContainer.addEventListener('wheel', handleWheel, { passive: true });
      scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: true });

      return () => {
        scrollContainer.removeEventListener('wheel', handleWheel);
        scrollContainer.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, []);

  // Handle auto-generate content with typing animation - wrapped in useCallback for stable reference
  const handleAutoGenerateContent = useCallback((content: string, topic: string) => {
    if (!editorRef.current || !activeDoc || !content) return;

    // Store content and topic for analysis
    setAnalysisContent(content);
    setAnalysisTopic(topic);

    // Clear editor and set title
    editorRef.current.innerHTML = '<p><br></p>';
    updateDocument(activeDoc.id, { title: topic });

    // Create a temporary paragraph for typing animation
    const tempParagraph = document.createElement('p');
    tempParagraph.innerHTML = '<br>';
    editorRef.current.innerHTML = '';
    editorRef.current.appendChild(tempParagraph);

    // Show thinking animation, then type the content
    showThinkingAnimation(tempParagraph, () => {
      // Create cursor for typing animation
      const cursor = document.createElement('div');
      cursor.className = 'ai-cursor visible typing';
      const targetRect = tempParagraph.getBoundingClientRect();
      cursor.style.left = `${targetRect.left}px`;
      cursor.style.top = `${targetRect.top}px`;
      document.body.appendChild(cursor);

      typeTextAnimation(content, tempParagraph, cursor, () => {
        // After typing completes, update document
        const newContent = editorRef.current?.innerHTML || '';
        const stats = calculateStats(newContent);
        // Clear any remaining typing progress
        if (activeDoc?.id) {
          localStorage.removeItem(`typing-progress-${activeDoc.id}`);
        }

        // Cache to localStorage
        cacheDocument({
          id: activeDoc.id,
          title: topic,
          content: newContent,
          type: activeDoc.type,
          wordCount: stats.words,
          charCount: stats.chars,
          pageSettings: activeDoc.pageSettings,
          updatedAt: new Date().toISOString(),
          version: 'v1'
        });

        updateDocument(activeDoc.id, {
          content: newContent,
          wordCount: stats.words,
          charCount: stats.chars,
        });
        setChiMood({ type: 'proud', comment: 'Artikel selesai dibuat! Silakan edit sesuai kebutuhan ✦' });
        // Show analysis canvas after typing completes
        setShowAnalysisCanvas(true);
        
        // Refresh usage display
        onRefreshUsage?.();
        
        // Generate and save analysis data to document
        // Generate analysis based on template type
        const templateDef = activeDoc.template ? DOCUMENT_TEMPLATES[activeDoc.template] : null;
        const isAcademic = templateDef?.type === 'essay' || templateDef?.type === 'thesis';
        
        const mockAnalysisData: AnalysisData = {
          strengths: isAcademic ? [
            'Struktur ' + (templateDef?.name || 'dokumen') + ' yang sesuai standar akademik',
            'Bahasa formal dan terminologi yang tepat',
            'Argumen yang sistematis dan logis',
            templateDef?.type === 'thesis' ? 'Metodologi penelitian yang jelas' : 'Alur pemikiran yang koheren',
          ] : [
            'Gaya penulisan yang menarik dan engaging',
            'Struktur konten yang mudah dipahami',
            'Topik yang relevan dengan pembaca target',
            'Nada dan voice yang konsisten',
          ],
          weaknesses: isAcademic ? [
            'Perlu penambahan referensi primer terkini',
            'Beberapa argumen perlu elaborasi lebih dalam',
            'Tinjauan pustaka bisa diperkaya',
          ] : [
            'Beberapa bagian bisa lebih konkret',
            'Tambahkan contoh atau ilustrasi',
            'Cek kembali flow dan transisi antar paragraf',
          ],
          predictedQuestions: [
            'Bagaimana metodologi yang digunakan memastikan validitas?',
            'Apa kontribusi unik dari tulisan ini?',
            'Bagaimana implikasi praktis dari temuan ini?',
            'Apa keterbatasan yang perlu diakui?',
          ],
          recommendations: isAcademic ? [
            'Tambahkan data atau referensi primer',
            'Perjelas metode analisis yang digunakan',
            'Perkaya tinjauan pustaka dengan jurnal terbaru',
            'Tambahkan pembahasan implikasi praktis',
          ] : [
            'Tambahkan visual atau contoh konkret',
            'Perjelas call-to-action atau pesan utama',
            'Optimalkan panjang paragraf untuk readability',
            'Tambahkan storytelling element',
          ],
          overallScore: isAcademic ? 82 : 78,
          generatedAt: new Date().toISOString(),
        };
        saveAnalysisToDocument(mockAnalysisData);
      }, activeDoc?.id);
    });
  }, [activeDoc, editorRef, updateDocument, setChiMood, setAnalysisContent, setAnalysisTopic, setShowAnalysisCanvas, saveAnalysisToDocument]);

  // Register onAutoGenerate callback
  useEffect(() => {
    if (onAutoGenerate) {
      onAutoGenerate(handleAutoGenerateContent);
    }
  }, [onAutoGenerate, handleAutoGenerateContent]);

  // Toggle placeholder visibility when showPlaceholders changes
  useEffect(() => {
    if (!editorRef.current || !activeDoc?.template) return;
    
    const editor = editorRef.current;
    const placeholders = editor.querySelectorAll('[data-template-placeholder]');
    const headings = editor.querySelectorAll('[data-template-section]');
    
    placeholders.forEach((el) => {
      const element = el as HTMLElement;
      if (showPlaceholders) {
        element.style.display = 'block';
        element.style.opacity = '0.4';
        element.style.fontStyle = 'italic';
        element.style.color = 'var(--text3, #9ca3af)';
        element.style.fontSize = '0.95em';
        element.style.letterSpacing = '0.3px';
      } else {
        element.style.display = 'none';
        element.style.opacity = '0';
      }
    });
    
    // Also toggle section headings (Pendahuluan, Argumen Utama, etc.)
    headings.forEach((el) => {
      const element = el as HTMLElement;
      if (showPlaceholders) {
        element.style.display = 'block';
        element.style.opacity = '1';
      } else {
        element.style.display = 'none';
        element.style.opacity = '0';
      }
    });
  }, [showPlaceholders, activeDoc?.template]);

  // Auto-save hook for draft persistence
  const { lastSaved, isSaving: isAutoSaving } = useAutoSave({
    documentId: activeDoc?.id || '',
    content,
    title: activeDoc?.title || '',
    type: activeDoc?.type || 'essay',
    template: activeDoc?.template,
    wordCount: activeDoc?.wordCount || 0,
    charCount: activeDoc?.charCount || 0,
    pageSettings: activeDoc?.pageSettings || DEFAULT_PAGE_SETTINGS,
    enabled: !!activeDoc?.id,
    interval: 3000, // Auto-save every 3 seconds
  });

  // Report autosave status changes to parent
  useEffect(() => {
    onAutoSaveStatusChange?.({ isAutoSaving, lastSaved });
  }, [isAutoSaving, lastSaved, onAutoSaveStatusChange]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Handle Ctrl+Wheel for zoom
  const handleWheelZoom = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoomLevel(prev => {
        const newZoom = prev + delta;
        return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      });
    }
  }, []);

  // Add/remove wheel event listener for zoom
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('wheel', handleWheelZoom, { passive: false });
      return () => {
        scrollContainer.removeEventListener('wheel', handleWheelZoom);
      };
    }
  }, [handleWheelZoom]);

  // Initialize editor content from draft/cache/activeDoc (priority: draft > cache > activeDoc)
  useEffect(() => {
    if (activeDoc && editorRef.current) {
      // Check for draft first (highest priority - from autosave)
      const draft = getDraft(activeDoc.id);
      if (draft && draft.content) {
        const draftTime = new Date(draft.updatedAt).getTime();
        const docTime = activeDoc.updatedAt ? new Date(activeDoc.updatedAt).getTime() : 0;
        
        // Use draft if it's newer than the document
        if (draftTime > docTime) {
          console.log('[WriteEditor] Loading from autosave draft:', draftTime, 'vs doc:', docTime);
          editorRef.current.innerHTML = draft.content;
          setContent(draft.content);
          // Also update the document state with draft data
          updateDocument(activeDoc.id, {
            title: draft.title,
            content: draft.content,
            wordCount: draft.wordCount,
            charCount: draft.charCount,
            pageSettings: draft.pageSettings,
          });
          return;
        }
      }

      // Check for unfinished AI typing progress
      const typingProgressKey = `typing-progress-${activeDoc.id}`;
      let typingProgress: { currentIndex: number; fullText: string; timestamp: number } | null = null;
      try {
        const saved = localStorage.getItem(typingProgressKey);
        if (saved) {
          typingProgress = JSON.parse(saved);
          // Check if progress is recent (within last 30 minutes)
          if (typingProgress && Date.now() - typingProgress.timestamp > 30 * 60 * 1000) {
            // Clear old progress
            localStorage.removeItem(typingProgressKey);
            typingProgress = null;
          }
        }
      } catch (e) {
        console.error('[WriteEditor] Error loading typing progress:', e);
      }

      // If there's unfinished typing progress, restore it immediately
      if (typingProgress && typingProgress.fullText) {
        const words = typingProgress.fullText.split(/(\s+)/);
        const typedContent = words.slice(0, typingProgress.currentIndex).join('');
        if (typedContent) {
          editorRef.current.innerHTML = `<p>${typedContent}</p>`;
          setContent(`<p>${typedContent}</p>`);
          console.log('[WriteEditor] Restored unfinished typing progress:', typingProgress.currentIndex, 'of', words.length, 'words');
          // Clear the progress since we've restored it
          localStorage.removeItem(typingProgressKey);
          return; // Skip normal cache loading since we restored typing progress
        }
      }

      // Try to load from cache first for instant display
      const cached = getCachedDocument(activeDoc.id);

      // Determine what content to load - prioritize cache if it exists
      let contentToLoad = '<p><br></p>';
      let shouldUseCache = false;

      if (cached && cached.content) {
        const cachedTime = new Date(cached.updatedAt).getTime();
        const docTime = activeDoc.updatedAt ? new Date(activeDoc.updatedAt).getTime() : 0;

        // Use cache if:
        // 1. It's newer than doc time (unsaved changes)
        // 2. It's within last 5 minutes (recent edit)
        // 3. Doc content is empty but cache has content
        if (cachedTime > docTime) {
          shouldUseCache = true;
        } else if (Date.now() - cachedTime < 5 * 60 * 1000) {
          shouldUseCache = true;
        } else if (!activeDoc.content || activeDoc.content === '<p><br></p>') {
          shouldUseCache = true;
        }

        if (shouldUseCache) {
          contentToLoad = cached.content;
          console.log('[WriteEditor] Loading from cache:', cachedTime, 'vs doc:', docTime, 'shouldUseCache:', shouldUseCache);
        } else {
          contentToLoad = activeDoc.content || '<p><br></p>';
        }
      } else {
        // No cache, use activeDoc content
        contentToLoad = activeDoc.content || '<p><br></p>';
      }

      // Always update editor when document ID changes to ensure proper content isolation
      const currentHTML = editorRef.current.innerHTML;
      const isEmpty = !currentHTML || currentHTML === '<p><br></p>' || currentHTML === '<br>';
      const isDifferent = currentHTML.replace(/\s/g, '') !== contentToLoad.replace(/\s/g, '');

      // Force update when switching documents (isDifferent) or when empty
      if (isEmpty || isDifferent) {
        editorRef.current.innerHTML = contentToLoad;
        setContent(contentToLoad);
        console.log('[WriteEditor] Editor content initialized for doc:', activeDoc.id);
      }
    }
  }, [activeDoc?.id]); // Only run when document ID changes


  // SFX Audio Context
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((f: number, d: number, t: string = 'sine', v: number = 0.18) => {
    if (!sfxEnabled) return;
    try {
      const c = getAudioCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = t as OscillatorType;
      o.frequency.value = f;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(v, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
      o.start();
      o.stop(c.currentTime + d);
    } catch (e) {}
  }, [sfxEnabled, getAudioCtx]);

  const SFX = {
    pop: () => {
      playTone(600, 0.09);
      setTimeout(() => playTone(300, 0.08), 55);
    },
    cheer: () => {
      [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'triangle', 0.16), i * 105));
    },
    click: () => playTone(820, 0.05, 'sine', 0.09),
  };

  // Get random Chi comment
  const getChiComment = (k: string, ctx: Record<string, string> = {}) => {
    const pool = (CHI_COMMENTS as any)[k] || CHI_COMMENTS.happy;
    let text = pool[Math.floor(Math.random() * pool.length)];
    Object.entries(ctx).forEach(([a, b]) => {
      text = text.replace(`{${a}}`, b);
    });
    return text;
  };

  // Trigger Chi comment with debounce
  const triggerComment = (k: string, ctx: Record<string, string> = {}) => {
    const now = Date.now();
    if (now - lastCommentTime < 22000 && k === 'happy') return;
    setLastCommentTime(now);
    setChiMood({ type: k as any, comment: getChiComment(k, ctx) });
    if (sfxEnabled) SFX.pop();
  };

  // Ghost text functionality
  const showGhostSuggestion = () => {
    if (!editorRef.current || !activeDoc) return;
    
    const docType = activeDoc.type || 'free';
    const pool = suggPool[docType] || suggPool.free;
    const suggestion = pool[Math.floor(Math.random() * pool.length)];
    
    setGhostText(suggestion);
    setShowGhost(true);
  };

  const clearGhost = () => {
    setShowGhost(false);
    setGhostText('');
  };

  const acceptGhost = () => {
    if (!editorRef.current || !ghostText) return;
    
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const textNode = document.createTextNode(ghostText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    clearGhost();
    if (activeDoc) {
      const newContent = editorRef.current.innerHTML;
      const stats = calculateStats(newContent);
      
      // Cache to localStorage
      cacheDocument({
        id: activeDoc.id,
        title: activeDoc.title,
        content: newContent,
        type: activeDoc.type,
        wordCount: stats.words,
        charCount: stats.chars,
        pageSettings: activeDoc.pageSettings,
        updatedAt: new Date().toISOString(),
        version: 'v1'
      });
      
      updateDocument(activeDoc.id, {
        content: newContent,
        wordCount: stats.words,
        charCount: stats.chars,
      });
    }
  };

  // Auto-scan paragraph
  const getLastParagraph = () => {
    if (!editorRef.current) return null;
    const paragraphs = editorRef.current.querySelectorAll('p');
    if (paragraphs.length === 0) return null;
    const lastP = paragraphs[paragraphs.length - 1];
    const text = lastP.innerText.trim();
    return { node: lastP, text };
  };

  const scanParagraph = () => {
    const result = getLastParagraph();
    if (!result) return;
    const { node, text } = result;
    
    if (text === lastParaTextRef.current) return;
    if (text.split(' ').length < 8) return;
    
    // Simulate paragraph analysis
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length > 0 && words.length > 20) {
      lastParaTextRef.current = text;
      triggerComment('para_done');
    }
  };

  // Use ref to track current activeDoc to avoid stale closure in debounced handler
  const activeDocRef = useRef(activeDoc);
  useEffect(() => {
    activeDocRef.current = activeDoc;
  }, [activeDoc]);

  // Immediate handler for UI updates (no expensive operations)
  const handleInputImmediate = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!e.currentTarget) return;
    const newContent = e.currentTarget.innerHTML;
    setContent(newContent);
    
    // We update stats locally for immediate feedback if needed, 
    // but the heavy state lifting is moved to debounce
  }, []);

  // Debounced handler for collaboration sync and document updates
  const handleCollabSync = useCallback(debounce((newContent: string) => {
    const currentDoc = activeDocRef.current;
    if (!currentDoc) return;

    // 1. Update parent state and stats
    const stats = calculateStats(newContent);
    updateDocument(currentDoc.id, {
      content: newContent,
      wordCount: stats.words,
      charCount: stats.chars,
    });

    // 2. Sync to Yjs for real-time collaboration using Diff-Match-Patch
    if (isCollaborative && yDocRef.current && yTextRef.current) {
      isLocalChangeRef.current = true; // Mark this as a local change for observe()
      try {
        const currentYContent = yTextRef.current.toString();
        if (newContent !== currentYContent) {
          const diffs = dmp.diff_main(currentYContent, newContent);
          dmp.diff_cleanupSemantic(diffs);
          
          yDocRef.current.transact(() => {
            let index = 0;
            for (const [op, text] of diffs) {
              if (op === 0) { // Unchanged
                index += text.length;
              } else if (op === 1) { // Insert
                yTextRef.current?.insert(index, text);
                index += text.length;
              } else if (op === -1) { // Delete
                yTextRef.current?.delete(index, text.length);
              }
            }
          });
          
          const update = encodeStateAsUpdate(yDocRef.current);
          sendDocumentUpdate(currentDoc.id, update);
        }
      } catch (err) {
        console.error('[WriteEditor] Error syncing Yjs:', err);
      } finally {
        isLocalChangeRef.current = false;
      }
    }
  }, 200), [isCollaborative, updateDocument]);



  // Debounced handler for caching and additional processing
  const handleInputDebounced = debounce((e: React.FormEvent<HTMLDivElement>) => {
    if (!e.currentTarget) return;
    const newContent = e.currentTarget.innerHTML;

    // Use ref to get current activeDoc, avoiding stale closure
    const currentDoc = activeDocRef.current;
    if (currentDoc) {
      const stats = calculateStats(newContent);

      // Cache to localStorage for persistence
      cacheDocument({
        id: currentDoc.id,
        title: currentDoc.title,
        content: newContent,
        type: currentDoc.type,
        wordCount: stats.words,
        charCount: stats.chars,
        pageSettings: currentDoc.pageSettings,
        updatedAt: new Date().toISOString(),
        version: 'v1'
      });

      console.log('[WriteEditor] Content cached, words:', stats.words, 'chars:', stats.chars);

      // Chi milestone celebrations
      if (stats.words === 100) {
        triggerComment('excited', { w: '100' });
        SFX.cheer();
      } else if (stats.words === 500) {
        triggerComment('celebrating', { w: '500' });
        SFX.cheer();
      } else if (stats.words === 1000) {
        triggerComment('celebrating', { w: '1000' });
        SFX.cheer();
      } else if (stats.words > 500) {
        setChiMood({ type: 'proud', comment: 'Kerja bagus! Terus semangat menulis!' });
      } else if (stats.words > 200) {
        setChiMood({ type: 'happy', comment: 'Progres yang baik, lanjutkan!' });
      }

      // Ghost text suggestion after typing
      if (stats.words > 10 && Math.random() > 0.7) {
        showGhostSuggestion();
      }

      // Auto-scan paragraph after typing pause
      if (paraReviewTimerRef.current) {
        clearTimeout(paraReviewTimerRef.current);
      }
      paraReviewTimerRef.current = setTimeout(() => {
        scanParagraph();
      }, 2000);
    }
  }, 300);

  // Combined input handler
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    isTypingLocallyRef.current = true;
    lastTypingTimeRef.current = Date.now();
    handleInputImmediate(e);
    handleInputDebounced(e);
    handleCollabSync(e.currentTarget.innerHTML);
  }, [handleInputImmediate, handleInputDebounced, handleCollabSync]);

  // Combined input handler - immediate for stats, debounced for caching
  // Handle Tab key to accept ghost text
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && showGhost) {
      e.preventDefault();
      acceptGhost();
    }
  };

  const handleSelectionChange = () => {
    // DO NOT hide the menu if we are currently typing a comment
    if (showCommentInput) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    if (sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelection({
        text: sel.toString(),
        range,
      });
      setAIMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setShowAIMenu(true);
    } else {
      setShowAIMenu(false);
      setSelection(null);
    }

    // Send cursor update in collaborative mode for any movement
    if (isCollaborative && documentId && editorRef.current) {
      const anchorNode = sel.anchorNode;
      const focusNode = sel.focusNode;
      
      const getAbsOffset = (targetNode: Node | null, targetOffset: number) => {
        if (!editorRef.current || !targetNode || !editorRef.current.contains(targetNode)) return 0;
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        
        try {
          range.setEnd(targetNode, targetOffset);
          return range.toString().length;
        } catch (e) {
          return 0;
        }
      };

      const anchor = getAbsOffset(anchorNode, sel.anchorOffset);
      const head = getAbsOffset(focusNode, sel.focusOffset);
      
      updateCursor(documentId, { anchor, head });
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const callGeminiAPI = async (type: string, text: string) => {
    try {
      const response = await fetch('/api/write/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, type }),
      });

      const data = await response.json();
      if (data.success) {
        return data.content;
      } else {
        throw new Error(data.error || 'Gagal mendapat respons AI');
      }
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  };

  const handleAIAction = async (action: string) => {
    if (!selection || !selection.range) return;

    setIsProcessing(true);
    setChiMood({ type: 'thinking', comment: 'Sedang memproses permintaan Anda...' });
    setShowAIMenu(false);

    try {
      const result = await callGeminiAPI(action, selection.text);
      
      // Replace selected text dengan hasil AI
      const range = selection.range;
      range.deleteContents();
      
      const temp = document.createElement('div');
      temp.innerHTML = result;
      const fragment = document.createDocumentFragment();
      let node;
    } finally {
      setIsProcessing(false);
      setSelection(null);
    }
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleHighlight = (mode: 'ai' | 'plagiarism') => {
    if (highlightMode === mode) {
      setHighlightMode('none');
      // Remove highlights
      if (editorRef.current) {
        editorRef.current.innerHTML = editorRef.current.innerHTML
          .replace(/<mark[^>]*>/g, '')
          .replace(/<\/mark>/g, '');
      }
    } else {
      setHighlightMode(mode);
      
      if (editorRef.current && content) {
        const text = editorRef.current.innerText;
        
        if (mode === 'ai') {
          const { ranges } = detectAIPatterns(text);
          // Apply highlights (simplified version)
          // Dalam production, gunakan library seperti mark.js
          setChiMood({ 
            type: 'concerned', 
            comment: `Terdeteksi ${ranges.length} pola yang mirip AI. Periksa bagian yang ditandai.` 
          });
        } else if (mode === 'plagiarism') {
          const { score } = detectPlagiarism(text);
          setChiMood({ 
            type: 'concerned', 
            comment: `Skor plagiarisme: ${score}%. Pastikan semua kutipan sudah dicantumkan.` 
          });
        }
      }
    }
  };

  const handleAutoGenerate = () => {
    setShowAutoModal(true);
  };

  // Trigger margin animation overlay
  const triggerMarginAnimation = () => {
    const pageElement = document.querySelector('.page');
    if (!pageElement) return;
    
    // Create animation overlay
    const overlay = document.createElement('div');
    overlay.className = 'margin-animation-overlay';
    pageElement.appendChild(overlay);
    
    // Create label popup
    const label = document.createElement('div');
    label.className = 'margin-label-popup';
    label.textContent = 'Margin Updated!';
    const rect = pageElement.getBoundingClientRect();
    label.style.left = `${rect.left + rect.width / 2 - 50}px`;
    label.style.top = `${rect.top + 20}px`;
    document.body.appendChild(label);
    
    // Remove elements after animation
    setTimeout(() => {
      overlay.remove();
      label.remove();
    }, 1000);
  };

  const handleCanvasPrompt = async () => {
    if (!canvasPrompt.trim() || !activeDoc || !editorRef.current) return;
    
    const prompt = canvasPrompt;
    const currentContent = editorRef.current.innerHTML;
    
    // Check for margin keywords FIRST before calling AI (to avoid JSON output in canvas)
    const marginValues = parseMarginKeywords(prompt);
    if (marginValues) {
      updateDocument(activeDoc.id, {
        pageSettings: {
          ...(activeDoc.pageSettings || DEFAULT_PAGE_SETTINGS),
          margins: marginValues,
        },
      });
      // Trigger margin animation
      triggerMarginAnimation();
      setChiMood({ type: 'proud', comment: `Margin diatur: ${marginValues.top}x${marginValues.right}x${marginValues.bottom}x${marginValues.left} cm ✦` });
      setCanvasPrompt('');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Get template-specific AI prompt if available
      const templateDef = activeDoc.template ? DOCUMENT_TEMPLATES[activeDoc.template] : null;
      const aiPrompt = templateDef ? 
        `${templateDef.aiPrompt}\n\nTopik/Prompt pengguna: ${prompt}` : 
        prompt;
      
      const apiEndpoint = aiProvider === 'gemini' ? '/api/write/gemini' : '/api/write/openrouter';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'canvas-prompt',
          prompt: aiPrompt,
          currentContent,
        }),
      });
      
      const data = await response.json();

      // Handle quota exceeded error
      if (!data.success && response.status === 403) {
        setChiMood({ type: 'concerned', comment: data.error || 'Kuota AI Anda telah habis. Silakan upgrade plan.' });
        // Show upgrade modal or notification
        const event = new CustomEvent('showUpgradeModal');
        window.dispatchEvent(event);
        return;
      }

      if (data.success && data.content) {
        // Create a temporary paragraph for typing animation
        const tempParagraph = document.createElement('p');
        tempParagraph.innerHTML = '<br>';
        editorRef.current.appendChild(tempParagraph);
        
        // Get prompt input element for cursor animation
        const promptInput = promptInputRef.current;
        if (promptInput) {
          // Animate cursor from prompt to target, then start thinking animation, then typing
          moveAICursor(promptInput, tempParagraph, () => {
            // After cursor arrives, show thinking animation
            showThinkingAnimation(tempParagraph, () => {
              // After thinking completes, create cursor and start typing animation
              const cursor = document.createElement('div');
              cursor.className = 'ai-cursor visible typing';
              const targetRect = tempParagraph.getBoundingClientRect();
              cursor.style.left = `${targetRect.left}px`;
              cursor.style.top = `${targetRect.top}px`;
              document.body.appendChild(cursor);

              typeTextAnimation(data.content, tempParagraph, cursor, () => {
                // After typing completes, update document
                const newContent = editorRef.current?.innerHTML || currentContent;
                const stats = calculateStats(newContent);
                // Clear any remaining typing progress
                if (activeDoc?.id) {
                  localStorage.removeItem(`typing-progress-${activeDoc.id}`);
                }
                updateDocument(activeDoc.id, {
                  content: newContent,
                  wordCount: stats.words,
                  charCount: stats.chars,
                });
              }, activeDoc?.id);
            });
          });
        } else {
          // Fallback without cursor animation - show thinking then type
          showThinkingAnimation(tempParagraph, () => {
            typeTextAnimation(data.content, tempParagraph, null as unknown as HTMLElement, () => {
              const newContent = editorRef.current?.innerHTML || currentContent;
              const stats = calculateStats(newContent);
              // Clear any remaining typing progress
              if (activeDoc?.id) {
                localStorage.removeItem(`typing-progress-${activeDoc.id}`);
              }
              updateDocument(activeDoc.id, {
                content: newContent,
                wordCount: stats.words,
                charCount: stats.chars,
              });
            }, activeDoc?.id);
          });
        }
        
        setChiMood({ type: 'proud', comment: 'Selesai! Silakan edit sesuai gayamu ✦' });
        setCanvasPrompt('');
        
        // Refresh usage display
        onRefreshUsage?.();
      } else {
        // Handle simple commands without API
        handleSimpleCommand(prompt);
      }
    } catch (error) {
      console.error('Error generating:', error);
      // Try simple commands as fallback
      handleSimpleCommand(prompt);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Parse margin keywords like "4x4x4x4", "4cm x 4cm", "4cm 4cm 4cm 4cm"
  // Order: top, left, bottom, right
  const parseMarginKeywords = (prompt: string): { top: number; right: number; bottom: number; left: number } | null => {
    const lowerPrompt = prompt.toLowerCase();

    // Pattern: "4x4x4x4" or "4 x 4 x 4 x 4" (order: top, left, bottom, right)
    const xPattern = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/;
    const xMatch = lowerPrompt.match(xPattern);
    if (xMatch) {
      return {
        top: parseFloat(xMatch[1]),
        left: parseFloat(xMatch[2]),
        bottom: parseFloat(xMatch[3]),
        right: parseFloat(xMatch[4]),
      };
    }

    // Pattern: "4cm x 4cm x 4cm x 4cm" or "4 cm x 4 cm x 4 cm x 4 cm" (order: top, left, bottom, right)
    const cmXPattern = /(\d+(?:\.\d+)?)\s*(?:cm)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:cm)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:cm)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:cm)?/i;
    const cmXMatch = lowerPrompt.match(cmXPattern);
    if (cmXMatch) {
      return {
        top: parseFloat(cmXMatch[1]),
        left: parseFloat(cmXMatch[2]),
        bottom: parseFloat(cmXMatch[3]),
        right: parseFloat(cmXMatch[4]),
      };
    }

    // Pattern: "4cm 4cm 4cm 4cm" or "4 cm 4 cm 4 cm 4 cm" (space separated, order: top, left, bottom, right)
    const spacePattern = /(\d+(?:\.\d+)?)\s*(?:cm)?\s+(\d+(?:\.\d+)?)\s*(?:cm)?\s+(\d+(?:\.\d+)?)\s*(?:cm)?\s+(\d+(?:\.\d+)?)\s*(?:cm)?/i;
    const spaceMatch = lowerPrompt.match(spacePattern);
    if (spaceMatch && lowerPrompt.includes('margin')) {
      return {
        top: parseFloat(spaceMatch[1]),
        left: parseFloat(spaceMatch[2]),
        bottom: parseFloat(spaceMatch[3]),
        right: parseFloat(spaceMatch[4]),
      };
    }

    // Pattern: "margin 4 4 4 4" (numbers after margin keyword, order: top, left, bottom, right)
    const marginNumPattern = /margin\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/;
    const marginNumMatch = lowerPrompt.match(marginNumPattern);
    if (marginNumMatch) {
      return {
        top: parseFloat(marginNumMatch[1]),
        left: parseFloat(marginNumMatch[2]),
        bottom: parseFloat(marginNumMatch[3]),
        right: parseFloat(marginNumMatch[4]),
      };
    }

    return null;
  };

  // AI Cursor animation - moves cursor from input to target position
  const moveAICursor = (
    fromElement: HTMLElement,
    targetElement: HTMLElement,
    onComplete?: () => void
  ) => {
    // Create cursor element
    const cursor = document.createElement('div');
    cursor.className = 'ai-cursor';
    document.body.appendChild(cursor);

    // Get starting position (from input/prompt element)
    const fromRect = fromElement.getBoundingClientRect();
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;

    // Get target position (where typing will happen)
    const targetRect = targetElement.getBoundingClientRect();
    const endX = targetRect.left;
    const endY = targetRect.top + targetRect.height;

    // Position cursor at start
    cursor.style.left = `${startX}px`;
    cursor.style.top = `${startY}px`;
    cursor.classList.add('visible');

    // Animate cursor to target position
    requestAnimationFrame(() => {
      cursor.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), left 0.6s cubic-bezier(0.4, 0, 0.2, 1), top 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      cursor.style.left = `${endX}px`;
      cursor.style.top = `${endY - 24}px`; // Position at text insertion point

      // After cursor arrives, start typing animation
      setTimeout(() => {
        cursor.classList.add('typing');
        
        // Create trail effect
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const trail = document.createElement('div');
            trail.className = 'ai-cursor-trail';
            trail.style.left = `${endX + Math.random() * 20 - 10}px`;
            trail.style.top = `${endY + Math.random() * 20 - 10}px`;
            document.body.appendChild(trail);
            
            requestAnimationFrame(() => {
              trail.style.opacity = '0.6';
            });
            
            setTimeout(() => {
              trail.style.opacity = '0';
              setTimeout(() => trail.remove(), 300);
            }, 200);
          }, i * 50);
        }

        // Start typing callback after cursor settles
        setTimeout(() => {
          onComplete?.();
        }, 300);

        // Remove cursor after typing animation completes (estimated)
        setTimeout(() => {
          cursor.style.opacity = '0';
          setTimeout(() => cursor.remove(), 200);
        }, 100);
      }, 600);
    });

    return cursor;
  };

  // Show "Thinking..." animation with animated dots
  const showThinkingAnimation = (targetElement: HTMLElement, onComplete?: () => void) => {
    // Create thinking container
    const thinkingContainer = document.createElement('span');
    thinkingContainer.className = 'thinking-text';
    thinkingContainer.innerHTML = 'Thinking<span class="thinking-dots"><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span></span>';
    targetElement.appendChild(thinkingContainer);

    // Random duration between 1-4 seconds (1000-4000ms)
    const duration = 1000 + Math.random() * 3000;

    // After duration, remove thinking text and call onComplete
    setTimeout(() => {
      thinkingContainer.remove();
      onComplete?.();
    }, duration);
  };

  // Type text word by word animation with blue glowing characters and persistence
  const typeTextAnimation = (fullText: string, targetElement: HTMLElement, cursorElement: HTMLElement, onComplete?: () => void, docId?: string) => {
    if (!fullText || typeof fullText !== 'string') {
      onComplete?.();
      return;
    }
    setIsTyping(true);

    // Restore state from localStorage if resuming after reload
    const storageKey = docId ? `typing-progress-${docId}` : null;
    let savedProgress: { currentIndex: number; fullText: string } | null = null;

    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          savedProgress = JSON.parse(saved);
          // Only restore if it's the same text (same doc + same content hash)
          if (savedProgress?.fullText === fullText) {
            console.log('[WriteEditor] Resuming typing animation from index:', savedProgress.currentIndex);
          } else {
            savedProgress = null;
          }
        }
      } catch (e) {
        console.error('[WriteEditor] Error loading typing progress:', e);
      }
    }

    const words = fullText.split(/(\s+)/); // Keep whitespace
    let currentIndex = savedProgress?.currentIndex || 0;
    let userScrolled = false;

    // Track if user manually scrolls
    const handleUserScroll = () => {
      userScrolled = true;
    };
    scrollRef.current?.addEventListener('scroll', handleUserScroll, { passive: true });

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    // Helper to wrap the last typed word with blue animation class
    const wrapLastWordWithAnimation = (text: string, lastWord: string) => {
      if (!lastWord) return text;
      // Find the last occurrence of the word and wrap it
      const lastIndex = text.lastIndexOf(lastWord);
      if (lastIndex === -1) return text;

      const before = text.substring(0, lastIndex);
      const after = text.substring(lastIndex + lastWord.length);
      return before + '<span class="typing-char">' + lastWord + '</span>' + after;
    };

    typingIntervalRef.current = setInterval(() => {
      if (currentIndex < words.length) {
        const currentWord = words[currentIndex];
        const wordsTyped = words.slice(0, currentIndex + 1);

        // Build HTML with blue animation on the most recently typed word
        let newHTML = '';
        for (let i = 0; i < wordsTyped.length; i++) {
          const word = wordsTyped[i];
          // Add blue animation to the 3 most recent words for a trail effect
          if (i >= wordsTyped.length - 3 && i < wordsTyped.length - 1 && word.trim()) {
            newHTML += '<span class="typing-char" style="animation-delay:' + (wordsTyped.length - 1 - i) * 0.1 + 's">' + word + '</span>';
          } else if (i === wordsTyped.length - 1 && word.trim()) {
            // Current word being typed - strongest blue glow
            newHTML += '<span class="typing-char">' + word + '</span>';
          } else {
            newHTML += word;
          }
        }

        targetElement.innerHTML = newHTML;
        currentIndex++;

        // Save progress to localStorage for persistence
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify({
              currentIndex,
              fullText,
              timestamp: Date.now()
            }));
          } catch (e) {
            // localStorage might be full, ignore
          }
        }

        // Update cursor position to follow typing
        if (cursorElement) {
          const rect = targetElement.getBoundingClientRect();
          const contentHeight = targetElement.scrollHeight;
          cursorElement.style.top = `${rect.top + Math.min(contentHeight, rect.height) - 24}px`;
        }

        // Scroll to keep typing element in view (only if user hasn't manually scrolled)
        if (scrollRef.current && !userScrolled) {
          const scrollContainer = scrollRef.current;
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          // Check if element is below visible area
          if (targetRect.bottom > containerRect.bottom - 50) {
            const scrollTop = targetElement.offsetTop - containerRect.height / 2;
            scrollContainer.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          }
        }
      } else {
        // Typing complete
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        scrollRef.current?.removeEventListener('scroll', handleUserScroll);

        // Clear progress from localStorage
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }

        // Final render without animation classes
        targetElement.innerHTML = fullText;

        // Remove cursor when done
        if (cursorElement) {
          cursorElement.style.opacity = '0';
          setTimeout(() => cursorElement.remove(), 200);
        }

        setIsTyping(false);
        onComplete?.();
      }
    }, 30 + Math.random() * 20); // Random typing speed 30-50ms per word part
  };

  const handleSimpleCommand = (prompt: string) => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for margin keywords first
    const marginValues = parseMarginKeywords(prompt);
    if (marginValues && activeDoc) {
      updateDocument(activeDoc.id, {
        pageSettings: {
          ...(activeDoc.pageSettings || DEFAULT_PAGE_SETTINGS),
          margins: marginValues,
        },
      });
      // Trigger margin animation
      triggerMarginAnimation();
      setChiMood({ type: 'proud', comment: `Margin diatur: ${marginValues.top}x${marginValues.right}x${marginValues.bottom}x${marginValues.left} cm ✦` });
      setCanvasPrompt('');
      return;
    }
    
    if (lowerPrompt.includes('rapihkan') || lowerPrompt.includes('rapikan') || lowerPrompt.includes('tata letak')) {
      setChiMood({ type: 'proud', comment: 'Tata letak sudah dirapikan! ✦' });
      setCanvasPrompt('');
    } else if (lowerPrompt.includes('margin')) {
      setChiMood({ type: 'proud', comment: 'Margin kanvas diatur! ✦' });
      setCanvasPrompt('');
    } else if (lowerPrompt.includes('footnote') || lowerPrompt.includes('catatan kaki')) {
      if (!activeDoc) return;
      const footnoteHTML = '<div class="footnote-area">1. Catatan kaki ditambahkan.</div>';
      const currentContent = editorRef.current?.innerHTML || '';
      const newContent = currentContent + footnoteHTML;
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
        const stats = calculateStats(newContent);
        updateDocument(activeDoc.id, { content: newContent, wordCount: stats.words, charCount: stats.chars });
      }
      setChiMood({ type: 'proud', comment: 'Footnote ditambahkan! ✦' });
      setCanvasPrompt('');
    } else if (lowerPrompt.includes('daftar pustaka') || lowerPrompt.includes('referensi')) {
      if (!activeDoc) return;
      const biblioHTML = '<h3>Daftar Pustaka</h3><p>[1] Penulis. (2024). Judul Buku. Penerbit.</p>';
      const currentContent = editorRef.current?.innerHTML || '';
      const newContent = currentContent + biblioHTML;
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
        const stats = calculateStats(newContent);
        updateDocument(activeDoc.id, { content: newContent, wordCount: stats.words, charCount: stats.chars });
      }
      setChiMood({ type: 'proud', comment: 'Daftar pustaka dibuat! ✦' });
      setCanvasPrompt('');
    } else if (lowerPrompt.includes('nomor halaman') || lowerPrompt.includes('page number')) {
      setShowPageNumbers(!showPageNumbers);
      setChiMood({ type: 'proud', comment: `Nomor halaman ${!showPageNumbers ? 'ditampilkan' : 'disembunyikan'}! ✦` });
      setCanvasPrompt('');
    } else if (lowerPrompt.includes('kesimpulan')) {
      if (!activeDoc) return;
      const conclusionHTML = '<p><strong>Kesimpulan.</strong> Berdasarkan pembahasan di atas, dapat disimpulkan bahwa...</p>';
      const currentContent = editorRef.current?.innerHTML || '';
      const newContent = currentContent + conclusionHTML;
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
        const stats = calculateStats(newContent);
        updateDocument(activeDoc.id, { content: newContent, wordCount: stats.words, charCount: stats.chars });
      }
      setChiMood({ type: 'proud', comment: 'Kesimpulan ditambahkan! ✦' });
      setCanvasPrompt('');
    } else {
      setChiMood({ type: 'concerned', comment: 'Maaf, aku belum mengerti perintah itu. Coba: "buatkan paragraf selanjutnya"' });
    }
  };
  
  const setPrompt = (text: string) => {
    setCanvasPrompt(text);
  };

  const handleCitation = () => {
    setShowCitationModal(true);
  };

  return (
    <div className="editor-panel">
      {/* Format Bar */}
      {showFormatBar && (
        <div className="format-bar">
          <div className="fmt-group">
            <select
              className="fmt-select"
              onChange={(e) => handleFormat('formatBlock', e.target.value)}
              defaultValue=""
            >
              <option value="">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="p">Paragraph</option>
            </select>
          </div>

          <div className="fmt-sep" />

          <div className="fmt-group">
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('bold')}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('italic')}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('underline')}
              title="Underline"
            >
              <u>U</u>
            </button>
          </div>

          <div className="fmt-sep" />

          <div className="fmt-group">
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('insertUnorderedList')}
              title="Bullet List"
            >
              ☰
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('insertOrderedList')}
              title="Numbered List"
            >
              1.
            </button>
          </div>

          <div className="fmt-sep" />

          <div className="fmt-sep" />

          <div className="fmt-group">
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('justifyLeft')}
              title="Align Left"
            >
              ⬅️
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('justifyCenter')}
              title="Align Center"
            >
              ↔️
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('justifyRight')}
              title="Align Right"
            >
              ➡️
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('justifyFull')}
              title="Justify"
            >
              �
            </button>
          </div>

          <div className="fmt-sep" />

          <div className="fmt-group">
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('strikethrough')}
              title="Strikethrough"
            >
              <s>S</s>
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('subscript')}
              title="Subscript"
            >
              X₂
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleFormat('superscript')}
              title="Superscript"
            >
              X²
            </button>
          </div>

          <div className="fmt-group">
            <button
              className="btn btn-icon btn-sm"
              onClick={handleCitation}
              title="Tambahkan Sitasi"
            >
              📖
            </button>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => {
                const sel = window.getSelection();
                if (sel && sel.toString().trim()) {
                  onToggleComments?.();
                } else {
                  setChiMood({ type: 'concerned', comment: 'Pilih teks terlebih dahulu untuk memberikan komentar.' });
                }
              }}
              title="Tambahkan Komentar"
            >
              <MessageSquarePlus size={16} />
            </button>
          </div>

          <div className="fmt-sep" />

          <button className="btn btn-sm" onClick={handleCitation}>
            � Sitasi
          </button>
          <button className="btn btn-sm btn-orange" onClick={handleAutoGenerate}>
            ✨ Auto-Generate
          </button>

          <div style={{ flex: 1 }} />

          <button
            className={`btn btn-sm ${highlightMode === 'ai' ? 'btn-primary' : ''}`}
            onClick={() => handleHighlight('ai')}
          >
            🤖 Deteksi AI
          </button>
          <button
            className={`btn btn-sm ${highlightMode === 'plagiarism' ? 'btn-primary' : ''}`}
            onClick={() => handleHighlight('plagiarism')}
          >
            📋 Deteksi Plagiarisme
          </button>
          
          <div className="fmt-sep" />
          
          <button
            className="btn btn-sm"
            onClick={() => setShowPageSettings(!showPageSettings)}
            title="Page Settings"
          >
            📄 Page
          </button>
        </div>
      )}
      
      {/* Page Settings Panel */}
      {showPageSettings && activeDoc && (
        <div className="page-settings-panel" style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div className="page-size-selector">
            <label style={{ fontSize: '11px', color: 'var(--text2)', marginRight: '8px' }}>
              Size:
            </label>
            <select
              className="fmt-select"
              value={activeDoc.pageSettings?.size || 'a4'}
              onChange={(e) => {
                const newSize = e.target.value as PageSize;
                updateDocument(activeDoc.id, {
                  pageSettings: {
                    ...(activeDoc.pageSettings || DEFAULT_PAGE_SETTINGS),
                    size: newSize,
                  },
                });
              }}
              style={{ fontSize: '12px', width: '120px' }}
            >
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="letter">Letter</option>
              <option value="legal">Legal</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="margin-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', color: 'var(--text2)' }}>Margins (cm):</label>
            {(['top', 'left', 'bottom', 'right'] as const).map((side) => (
              <div key={side} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '10px', textTransform: 'capitalize', color: 'var(--text3)' }}>
                  {side[0]}
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={activeDoc.pageSettings?.margins?.[side] ?? 2.5}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    updateDocument(activeDoc.id, {
                      pageSettings: {
                        ...(activeDoc.pageSettings || DEFAULT_PAGE_SETTINGS),
                        margins: {
                          ...(activeDoc.pageSettings?.margins || DEFAULT_PAGE_SETTINGS.margins),
                          [side]: value,
                        },
                      },
                    });
                  }}
                  style={{
                    width: '40px',
                    fontSize: '11px',
                    padding: '2px 4px',
                    border: '1px solid var(--border)',
                    borderRadius: '3px',
                    background: 'var(--bg2)',
                  }}
                />
              </div>
            ))}
          </div>
          
          <button
            className="btn btn-sm"
            onClick={() => {
              if (activeDoc) {
                updateDocument(activeDoc.id, {
                  pageSettings: DEFAULT_PAGE_SETTINGS,
                });
              }
            }}
            style={{ marginLeft: 'auto' }}
          >
            Reset to Default
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`editor-scroll  ${(showAnalysisCanvas || activeDoc?.analysisData) ? 'with-analysis' : ''}`}
        style={{ position: 'relative' }}
      >
        {myRole === 'pending' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: 'var(--bg)', padding: '24px', borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.1)', textAlign: 'center',
              maxWidth: '400px', border: '1px solid var(--border)'
            }}>
              <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>🔒 Menunggu Persetujuan</h2>
              <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.5 }}>
                Pemilik dokumen harus menyetujui permintaan Anda sebelum Anda dapat mengakses dan mengedit dokumen ini.
              </p>
            </div>
          </div>
        )}
        <div className="workspace-horizontal">
          <div className="pages-wrapper" style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out',
            position: 'relative',
          }}>
            <div
              className={`page page-${activeDoc?.pageSettings?.size || 'a4'}`}
              style={{
                padding: activeDoc?.pageSettings?.size === 'custom'
                  ? `${activeDoc?.pageSettings?.margins?.top || 2.5}cm ${activeDoc?.pageSettings?.margins?.right || 2.5}cm ${activeDoc?.pageSettings?.margins?.bottom || 2.5}cm ${activeDoc?.pageSettings?.margins?.left || 2.5}cm`
                  : `${activeDoc?.pageSettings?.margins?.top ?? 2.5}cm ${activeDoc?.pageSettings?.margins?.right ?? 2.5}cm ${activeDoc?.pageSettings?.margins?.bottom ?? 2.5}cm ${activeDoc?.pageSettings?.margins?.left ?? 2.5}cm`,
                width: activeDoc?.pageSettings?.size === 'custom'
                  ? `${activeDoc?.pageSettings?.customWidth || 21}cm`
                  : undefined,
                minHeight: activeDoc?.pageSettings?.size === 'custom'
                  ? `${activeDoc?.pageSettings?.customHeight || 29.7}cm`
                  : undefined,
              }}
            >
              <div
                ref={editorRef}
                className="editor-content"
                contentEditable={myRole !== 'viewer' && myRole !== 'pending'}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                suppressContentEditableWarning
                spellCheck={false}
              />
              
              {/* Visual Selection & Cursor Layer */}
              <div className="remote-cursors-layer" style={{ 
                position: 'absolute', 
                top: editorRef.current?.offsetTop || 0, 
                left: editorRef.current?.offsetLeft || 0, 
                width: editorRef.current?.offsetWidth || '100%', 
                height: editorRef.current?.offsetHeight || '100%', 
                pointerEvents: 'none',
                zIndex: 10
              }}>
                {remoteUsers.map(u => {
                  if (!u.cursorPosition || !editorRef.current) return null;
                  
                  const isSelecting = u.cursorPosition.anchor !== u.cursorPosition.head;
                  const start = Math.min(u.cursorPosition.anchor, u.cursorPosition.head);
                  const end = Math.max(u.cursorPosition.anchor, u.cursorPosition.head);

                  // Helper to get rects for selection
                  const getSelectionRects = (start: number, end: number) => {
                    if (!editorRef.current) return [];
                    const range = document.createRange();
                    let startNode: Node | null = null;
                    let startOffset = 0;
                    let endNode: Node | null = null;
                    let endOffset = 0;
                    
                    let charCount = 0;
                    const nodeStack: Node[] = [editorRef.current];
                    while (nodeStack.length > 0) {
                      const node = nodeStack.pop()!;
                      if (node.nodeType === 3) {
                        const nextCharCount = charCount + (node.textContent?.length || 0);
                        if (!startNode && start <= nextCharCount) {
                          startNode = node;
                          startOffset = Math.max(0, start - charCount);
                        }
                        if (!endNode && end <= nextCharCount) {
                          endNode = node;
                          endOffset = Math.max(0, end - charCount);
                        }
                        charCount = nextCharCount;
                      } else {
                        for (let i = node.childNodes.length - 1; i >= 0; i--) nodeStack.push(node.childNodes[i]);
                      }
                    }

                    // Fallback for empty editor
                    if (editorRef.current.innerText.trim() === '' || editorRef.current.childNodes.length === 0) {
                      return [{ top: 10, left: 10, width: 0, height: 24 }];
                    }

                    if (startNode && endNode) {
                      range.setStart(startNode, startOffset || 0);
                      range.setEnd(endNode, endOffset || 0);
                      
                      const containerRect = editorRef.current.getBoundingClientRect();
                      let clientRects = Array.from(range.getClientRects());
                      
                      // Fallback for collapsed range or invisible range
                      if (clientRects.length === 0) {
                        const bound = range.getBoundingClientRect();
                        if (bound.width === 0 && bound.height === 0) {
                          // Try to get the rect of the container node
                          const nodeRect = (startNode.parentElement || editorRef.current).getBoundingClientRect();
                          return [{
                            top: (nodeRect.top - containerRect.top) / zoomLevel,
                            left: (nodeRect.left - containerRect.left) / zoomLevel,
                            width: 0,
                            height: 24
                          }];
                        }
                        clientRects = [bound];
                      }

                      return clientRects.map(r => ({
                        top: (r.top - containerRect.top) / zoomLevel,
                        left: (r.left - containerRect.left) / zoomLevel,
                        width: r.width / zoomLevel,
                        height: r.height / zoomLevel
                      }));
                    }
                    
                    // Final fallback to the end of the editor
                    const lastRect = editorRef.current.getBoundingClientRect();
                    return [{
                      top: (lastRect.bottom - lastRect.top - 30) / zoomLevel,
                      left: 10,
                      width: 0,
                      height: 24
                    }];
                  };

                  const rects = getSelectionRects(start, end);
                  if (!rects || rects.length === 0) return null;

                  const cursorCoords = rects[u.cursorPosition.head >= u.cursorPosition.anchor ? rects.length - 1 : 0];

                  return (
                    <div key={u.userId}>
                      {/* Selection Highlight */}
                      {isSelecting && rects.map((r, i) => (
                        <div 
                          key={i}
                          style={{
                            position: 'absolute',
                            top: r.top,
                            left: r.left,
                            width: r.width,
                            height: r.height,
                            backgroundColor: u.userColor,
                            opacity: 0.2,
                            pointerEvents: 'none'
                          }}
                        />
                      ))}
                      
                      {/* Cursor */}
                      <div 
                        className="remote-cursor"
                        style={{
                          position: 'absolute',
                          top: cursorCoords.top,
                          left: u.cursorPosition.head >= u.cursorPosition.anchor ? cursorCoords.left + cursorCoords.width : cursorCoords.left,
                          width: '2px',
                          height: cursorCoords.height || '1.2em',
                          backgroundColor: u.userColor,
                          transition: 'all 0.05s linear'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '-18px',
                          left: '-2px',
                          backgroundColor: u.userColor,
                          color: 'white',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          whiteSpace: 'nowrap',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {u.userName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Analysis Canvas - appears after auto-generate */}
          <AnalysisCanvas
            content={analysisContent}
            topic={analysisTopic}
            isVisible={showAnalysisCanvas || !!activeDoc?.analysisData}
            onClose={() => setShowAnalysisCanvas(false)}
            aiProvider={aiProvider}
            persistedAnalysis={activeDoc?.analysisData}
            onAnalysisGenerated={saveAnalysisToDocument}
          />
          
          {/* Comments Panel */}
          {showComments && documentId && (
            <div style={{
              width: '320px',
              minWidth: '320px',
              maxWidth: '320px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 200px)',
            }}>
              <CommentThread
                comments={commentsHook.comments}
                onAddComment={commentsHook.addComment}
                onReply={commentsHook.addReply}
                onResolve={commentsHook.resolveComment}
                currentUserId={userId || ''}
                canComment={!!canComment}
              />
            </div>
          )}
        </div>

        {/* Workspace Controls - Sticky at bottom of canvas */}
        <div style={{
          position: 'sticky',
          bottom: '12px',
          left: '0',
          right: '0',
          display: 'flex',
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 100,
          marginTop: '20px',
          padding: '0 12px',
        }}>
          {/* Left: Zoom Controls Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '4px',
            // boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
          }}>
            <button
              onClick={handleZoomOut}
              style={{
                width: '28px',
                height: '28px',
                border: 'none',
                background: 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Zoom Out (Ctrl+Scroll)"
            >
              −
            </button>
            <span style={{
              fontSize: '11px',
              color: 'var(--text)',
              minWidth: '45px',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={{
                width: '28px',
                height: '28px',
                border: 'none',
                background: 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Zoom In (Ctrl+Scroll)"
            >
              +
            </button>
            <button
              onClick={handleZoomReset}
              style={{
                width: '28px',
                height: '28px',
                border: 'none',
                background: 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Reset Zoom"
            >
              ⟲
            </button>
          </div>

          {/* Right: Guide & Comment Controls Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '4px 8px',
            // boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
          }}>
            {activeDoc?.template && activeDoc.template !== 'blank' && (
              <button
                onClick={() => setShowPlaceholders(!showPlaceholders)}
                style={{
                  height: '28px',
                  border: 'none',
                  background: showPlaceholders ? 'transparent' : 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: showPlaceholders ? 'var(--orange)' : 'var(--text3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0 10px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                title={showPlaceholders ? 'Sembunyikan panduan template' : 'Tampilkan panduan template'}
              >
                {showPlaceholders ? <Eye size={14} /> : <EyeOff size={14} />}
                <span style={{ fontSize: '11px', fontWeight: 500 }}>
                  {showPlaceholders ? 'Sembunyikan Panduan' : 'Tampilkan Panduan'}
                </span>
              </button>
            )}

            {/* Comment toggle button */}
            {onToggleComments && (
              <>
                {activeDoc?.template && activeDoc.template !== 'blank' && (
                  <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 2px' }} />
                )}
                <button
                  onClick={onToggleComments}
                  style={{
                    width: '28px',
                    height: '28px',
                    border: 'none',
                    background: showComments ? 'var(--blue-light, rgba(37,99,235,0.15))' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: showComments ? 'var(--blue)' : 'var(--text3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  title={showComments ? 'Sembunyikan komentar' : 'Tampilkan komentar'}
                >
                  <MessageSquare size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ghost text rendered outside scroll area */}
      {showGhost && ghostText && (
        <span 
          className="ghost-text"
          style={{
            position: 'fixed',
            color: 'var(--text3)',
            opacity: 0.5,
            pointerEvents: 'none',
            marginLeft: '4px',
            zIndex: 100,
          }}
        >
          {ghostText.split(' ').slice(0, 6).join(' ')}
          {ghostText.split(' ').length > 6 ? ' …' : ''}
          <span className="ghost-hint"> (Tab)</span>
        </span>
      )}
      {/* Canvas Prompt Bar - at bottom */}
      <div className="canvas-prompt-bar" style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        padding: '8px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => {}}
            style={{ fontSize: '11px' }}
          >
            🎭 Replikasi Gaya
          </button>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              ref={promptInputRef}
              type="text"
              value={canvasPrompt}
              onChange={(e) => setCanvasPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCanvasPrompt();
              }}
              placeholder="Buntu? Ketik instruksi ke Chi — mis: 'buatkan paragraf selanjutnya tentang dampak AI'"
              style={{
                width: '100%',
                padding: '8px 40px 8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                fontSize: '12px',
                background: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
              }}
              disabled={isGenerating}
            />
            <button
              onClick={handleCanvasPrompt}
              disabled={isGenerating}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                border: 'none',
                background: 'var(--orange)',
                borderRadius: '50%',
                color: '#fff',
                fontSize: '13px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              ↑
            </button>
          </div>
          {isGenerating && (
            <span style={{ fontSize: '10px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
              ⏳ Chi menulis...
            </span>
          )}
        </div>
        
        {/* Suggestion Buttons */}
        <div style={{ display: 'flex', gap: '6px', paddingBottom:'12px', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={() => setPrompt('Rapihkan tata letak')} style={{ fontSize: '11px', color: 'var(--text2)', borderRadius: '12px', background: 'var(--bg)',  }}>
            Rapihkan tata letak
          </button>
          <button className="btn btn-sm" onClick={() => setPrompt('Atur margin 4x4x3x3')} style={{ fontSize: '11px', color: 'var(--text2)', borderRadius: '12px', background: 'var(--bg)',  }}>
            Atur margin 4x4x3x3
          </button>
          <button className="btn btn-sm" onClick={() => setPrompt('Buatkan Daftar Pustaka')} style={{ fontSize: '11px', color: 'var(--text2)', borderRadius: '12px', background: 'var(--bg)',  }}>
            Buatkan Daftar Pustaka
          </button>
          <button className="btn btn-sm" onClick={() => setPrompt('Buatkan Footnote')} style={{ fontSize: '11px', color: 'var(--text2)', borderRadius: '12px', background: 'var(--bg)',  }}>
            Buatkan Footnote
          </button>
          <button className="btn btn-sm" onClick={() => setPrompt('Tambahkan Nomor Halaman')} style={{ fontSize: '11px', color: 'var(--text2)', borderRadius: '12px', background: 'var(--bg)',  }}>
            Tambahkan Nomor Halaman
          </button>
          <button className="btn btn-sm" onClick={() => setPrompt('Buat kesimpulan')} style={{ fontSize: '11px', color: 'var(--text2)', borderRadius: '12px', background: 'var(--bg)',  }}>
            Buat kesimpulan
          </button>
        </div>
      </div>

      {/* Floating Action Menu (AI + Comment) */}
      {(selection || showCommentInput) && !isProcessing && (
        <div
          className="floating-toolbar"
          style={{
            position: 'fixed',
            left: aiMenuPosition.x,
            top: aiMenuPosition.y - 15,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            alignItems: 'stretch',
            pointerEvents: 'auto'
          }}
        >
          {!showCommentInput ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              padding: '6px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.08)',
              minWidth: '160px'
            }}>
              <button className="ai-menu-btn-vertical" onClick={() => handleAIAction('improve')}>
                ✨ Perbaiki Penulisan
              </button>
              <button className="ai-menu-btn-vertical" onClick={() => handleAIAction('paraphrase')}>
                🔄 Parafrasekan Teks
              </button>
              <button className="ai-menu-btn-vertical" onClick={() => handleAIAction('expand')}>
                📝 Kembangkan Paragraf
              </button>
              <button className="ai-menu-btn-vertical" onClick={() => handleAIAction('summarize')}>
                📋 Ringkas Konten
              </button>
              
              <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
              
              <button 
                className="ai-menu-btn-vertical" 
                onClick={() => {
                  if (selection) {
                    setCapturedSelection({
                      text: selection.text,
                      anchor: getCursorOffset(editorRef.current), // Need to store these for precision if needed
                      head: getCursorOffset(editorRef.current) // Simplified for now
                    });
                    setShowCommentInput(true);
                  }
                }}
                style={{ color: 'var(--brand)', fontWeight: '600' }}
              >
                💬 Tambahkan Komentar
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'white',
              padding: '12px',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              border: '1px solid var(--brand-light)',
              minWidth: '280px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px' }}>Memberikan komentar pada: "{capturedSelection?.text.substring(0, 30)}..."</div>
              <textarea 
                autoFocus
                placeholder="Tulis pesan komentar Anda..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'none',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    setShowCommentInput(false);
                    setCommentInput('');
                    setCapturedSelection(null);
                  }}
                  style={{ background: 'transparent', border: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--text2)' }}
                >Batal</button>
                <button 
                  onClick={async () => {
                    if (commentInput.trim() && capturedSelection) {
                      const success = await commentsHook.addComment(commentInput, { 
                        text: capturedSelection.text,
                      });
                      
                      if (success) {
                        setCommentInput('');
                        setShowCommentInput(false);
                        setCapturedSelection(null);
                        setChiMood({ type: 'happy', comment: 'Komentar berhasil ditambahkan!' });
                        onToggleComments?.();
                      } else {
                        setChiMood({ type: 'concerned', comment: 'Gagal mengirim komentar. Silakan login kembali.' });
                      }
                    }
                  }}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
                    zIndex: 1002
                  }}
                >Kirim Komentar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .ai-menu-btn-vertical {
          background: transparent;
          border: none;
          padding: 8px 12px;
          text-align: left;
          font-size: 13px;
          cursor: pointer;
          border-radius: 6px;
          display: flex;
          alignItems: center;
          gap: 8px;
          transition: background 0.2s;
          color: var(--text1);
        }
        .ai-menu-btn-vertical:hover {
          background: rgba(0,0,0,0.04);
        }
      `}</style>
    </div>
  );
}