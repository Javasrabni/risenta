import { WritingStats } from '@/types/write';

export function calculateStats(content: string): WritingStats {
  const text = content.replace(/<[^>]*>/g, '').trim();
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  const sentences = (text.match(/[.!?]+/g) || []).length;
  const paragraphs = content.split(/<\/p>/).length - 1 || 1;
  const readingTime = Math.ceil(words / 200); // 200 kata per menit

  return { words, chars, sentences, paragraphs, readingTime };
}

export function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Implementasi toast notification
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', { detail: { message, type } });
    window.dispatchEvent(event);
  }
}

export function saveToLocalStorage(key: string, value: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined') {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  }
  return defaultValue;
}

// Deteksi pola AI (simulasi)
export function detectAIPatterns(text: string): { score: number; ranges: any[] } {
  const aiPhrases = [
    'penting untuk dicatat bahwa',
    'dalam konteks ini',
    'perlu dipahami bahwa',
    'sebagai tambahan',
    'dengan demikian',
    'secara umum dapat dikatakan',
    'dalam hal ini',
    'berdasarkan hal tersebut',
  ];

  const ranges: any[] = [];
  let totalMatches = 0;

  aiPhrases.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      totalMatches++;
      ranges.push({
        start: match.index,
        end: match.index + phrase.length,
        score: 75 + Math.floor(Math.random() * 20),
      });
    }
  });

  const score = Math.min(95, totalMatches * 8);
  return { score, ranges };
}

// Deteksi plagiarisme (simulasi)
export function detectPlagiarism(text: string): { score: number; ranges: any[] } {
  // Simulasi sederhana - dalam production seharusnya memanggil API
  const commonPhrases = text.match(/\b\w{10,}\b/g) || [];
  const score = Math.min(commonPhrases.length * 2, 85);
  
  return { score, ranges: [] };
}

// Generate ID unik
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format tanggal
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);
}

// Hitung streak
export function calculateStreak(history: boolean[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}