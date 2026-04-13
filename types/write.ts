// Types untuk aplikasi Write
export type DocumentType = 'essay' | 'article' | 'journal' | 'thesis' | 'blank';
export type PageSize = 'a4' | 'a5' | 'letter' | 'legal' | 'custom';

// Document Templates
export type DocumentTemplate = 'blank' | 'essay' | 'thesis' | 'article' | 'journal' | 'research' | 'report';

export interface TemplateSection {
  id: string;
  title: string;
  placeholder: string;
  description?: string;
}

export interface DocumentTemplateDef {
  id: DocumentTemplate;
  name: string;
  icon: string;
  description: string;
  type: DocumentType;
  sections: TemplateSection[];
  aiPrompt: string;
}

export interface PageMargins {
  top: number;    // in cm
  right: number;  // in cm
  bottom: number; // in cm
  left: number;   // in cm
}

export interface PageSettings {
  size: PageSize;
  margins: PageMargins;
  customWidth?: number;  // in cm, for custom size
  customHeight?: number; // in cm, for custom size
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'a4',
  margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
};

export const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  a4: { width: 21, height: 29.7, label: 'A4 (21 x 29.7 cm)' },
  a5: { width: 14.8, height: 21, label: 'A5 (14.8 x 21 cm)' },
  letter: { width: 21.6, height: 27.9, label: 'Letter (8.5 x 11 inch)' },
  legal: { width: 21.6, height: 35.6, label: 'Legal (8.5 x 14 inch)' },
  custom: { width: 21, height: 29.7, label: 'Custom' },
};

export interface AnalysisData {
  strengths: string[];
  weaknesses: string[];
  predictedQuestions: string[];
  recommendations: string[];
  overallScore: number;
  generatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  template?: DocumentTemplate;
  wordCount: number;
  charCount: number;
  pageSettings: PageSettings;
  analysisData?: AnalysisData;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// Template Definitions
export const DOCUMENT_TEMPLATES: Record<DocumentTemplate, DocumentTemplateDef> = {
  blank: {
    id: 'blank',
    name: 'Kosong',
    icon: '📄',
    description: 'Dokumen kosong untuk menulis bebas',
    type: 'essay',
    sections: [],
    aiPrompt: 'Tulis artikel bebas tentang topik berikut dengan struktur yang natural dan mengalir.'
  },
  essay: {
    id: 'essay',
    name: 'Esai',
    icon: '📝',
    description: 'Esai akademik dengan struktur standar',
    type: 'essay',
    sections: [
      { id: 'intro', title: 'Pendahuluan', placeholder: '[Hook] Mulai dengan kutipan, pertanyaan provokatif, atau fakta menarik untuk menarik perhatian pembaca.\n\n[Latar Belakang] Jelaskan konteks topik dan mengapa topik ini penting untuk dibahas. Hubungkan dengan fenomena aktual atau masalah yang relevan.\n\n[Tesis/Pernyataan Masalah] Nyatakan argumen utama atau posisi Anda secara jelas dan spesifik dalam satu kalimat yang kuat.', description: 'Hook, latar belakang, dan tesis statement' },
      { id: 'body1', title: 'Argumen Utama', placeholder: '[Topic Sentence] Mulai paragraf dengan pernyataan utama argumen pertama.\n\n[Bukti/Contoh] Sertakan data, kutipan ahli, studi kasus, atau contoh konkret yang mendukung argumen.\n\n[Analisis] Jelaskan bagaimana bukti tersebut mendukung argumen Anda. Hubungkan dengan teori atau kerangka konseptual.\n\n[Transisi] Persiapkan pembaca untuk berpindah ke argumen berikutnya.', description: 'Argumen pertama dengan bukti dan analisis' },
      { id: 'body2', title: 'Pembahasan & Argumen Tambahan', placeholder: '[Argumen Kedua] Kembangkan argumen pendukung atau sudut pandang alternatif yang memperkuat posisi Anda.\n\n[Counter-argument & Refutasi] (Opsional) Sebutkan argumen lawan dan berikan sanggahan yang logis berdasarkan bukti.\n\n[Sintesis] Gabungkan berbagai perspektif untuk menunjukkan kedalaman pemikiran Anda tentang topik ini.', description: 'Argumen lanjutan dan pembahasan mendalam' },
      { id: 'conclusion', title: 'Kesimpulan', placeholder: '[Restatement Tesis] Ulangi argumen utama dengan cara yang berbeda, mengintegrasikan insight dari pembahasan.\n\n[Ringkasan Poin Kunci] Soroti 2-3 temuan atau argumen terkuat tanpa mengulang detail teknis.\n\n[Implikasi/Call to Action] Tutup dengan signifikansi lebih luas, rekomendasi praktis, atau pertanyaan reflektif untuk pembaca.', description: 'Restatement, ringkasan, dan implikasi' }
    ],
    aiPrompt: 'Tulis esai akademik dengan struktur: 1) Pendahuluan dengan latar belakang, 2) Argumen utama dengan bukti, 3) Pembahasan analitis, 4) Kesimpulan. Gunakan bahasa formal akademik.'
  },
  thesis: {
    id: 'thesis',
    name: 'Makalah / Skripsi',
    icon: '🎓',
    description: 'Format makalah akademik lengkap',
    type: 'thesis',
    sections: [
      { id: 'abstract', title: 'Abstrak', placeholder: '[Latar Belakang Singkat] (20%) Konteks dan urgensi penelitian dalam 1-2 kalimat.\n\n[Tujuan] (15%) Pernyataan spesifik tentang apa yang ingin dicapai/diteliti.\n\n[Metode] (20%) Rancangan penelitian, sampel, instrumen, dan teknik analisis data.\n\n[Hasil Utama] (25%) Temuan signifikan yang menjawab rumusan masalah.\n\n[Kesimpulan & Implikasi] (20%) Kontribusi teoretis/praktis dan rekomendasi singkat.\n\n[Keywords] 3-5 istilah kunci yang merepresentasikan fokus penelitian.', description: 'Ringkasan 150-250 kata dengan struktur IMRAD' },
      { id: 'chapter1', title: 'Bab I: Pendahuluan', placeholder: '[1.1 Latar Belakang] Gambarkan fenomena yang diteliti dengan data/statistik. Identifikasi gap atau masalah yang ada. Jelaskan mengapa topik ini signifikan secara teoritis dan praktis.\n\n[1.2 Rumusan Masalah] Nyatakan pertanyaan penelitian spesifik yang terukur dan terjawab dalam penelitian ini.\n\n[1.3 Tujuan Penelitian] Uraikan tujuan umum dan spesifik yang selaras dengan rumusan masalah.\n\n[1.4 Signifikansi/Kontribusi] Jelaskan kontribusi teoritis (pengembangan teori) dan praktis (aplikasi/rekomendasi kebijakan).', description: 'Latar belakang, rumusan masalah, tujuan, dan signifikansi' },
      { id: 'chapter2', title: 'Bab II: Tinjauan Pustaka', placeholder: '[Kerangka Teoritis] Presentasikan teori/teori utama yang relevan sebagai fondasi analisis. Identifikasi variabel dan hubungan antar konsep.\n\n[Penelitian Terdahulu] Review minimal 10-15 studi relevan (70% dari 5 tahun terakhir). Klasifikasikan berdasarkan temuan, metode, atau konteks.\n\n[Synthesis/Gap Analysis] Identifikasi celah pengetahuan yang belum terjawab. Tunjukkan bagaimana penelitian ini mengisi gap tersebut.\n\n[Hipotesis/Kerangka Konseptual] (jika kuantitatif) Jelaskan hubungan yang diuji dengan diagram/model.', description: 'Landasan teori dan penelitian terdahulu' },
      { id: 'chapter3', title: 'Bab III: Metodologi', placeholder: '[3.1 Desain Penelitian] Kualitatif/Kuantitatif/Mixed. Jenis studi (eksperimen, survei, etnografi, studi kasus, dll).\n\n[3.2 Lokasi & Waktu] Konteks geografis dan temporal penelitian.\n\n[3.3 Populasi & Sampel] Karakteristik partisipan, teknik sampling, ukuran sampel, dan kriteria inklusi/eksklusi.\n\n[3.4 Instrumen Pengumpulan Data] Deskripsi alat/kuesioner/wawancara. Uji validitas dan reliabilitas (Cronbach alpha, expert judgment).\n\n[3.5 Teknik Analisis Data] Proses pengolahan data: reduksi, display, verification (Miles & Huberman) atau statistik deskriptif/inferensial.', description: 'Desain, sampel, instrumen, dan analisis data' },
      { id: 'chapter4', title: 'Bab IV: Hasil & Pembahasan', placeholder: '[4.1 Karakteristik Sampel] Profil demografis partisipan (tabel/grafik).\n\n[4.2 Hasil Analisis] Presentasi tematik (kualitatif) atau statistik (kuantitatif). Gunakan tabel, grafik, atau kutipan representatif.\n\n[4.3 Pembahasan] Interpretasi hasil dengan teori. Bandingkan dengan penelitian terdahulu. Jelaskan konsistensi/kontradiksi.\n\n[4.4 Implikasi] Implikasi teoritis (pengembangan teori) dan praktis (rekomendasi implementasi).', description: 'Temuan, analisis, dan pembahasan' },
      { id: 'chapter5', title: 'Bab V: Kesimpulan & Saran', placeholder: '[5.1 Kesimpulan] Ringkasan jawaban langsung terhadap setiap rumusan masalah. Soroti temuan inovatif/utama.\n\n[5.2 Keterbatasan Penelitian] Akui secara jujur kelemahan metodologis (sampel, waktu, instrumen) yang memengaruhi generalisasi.\n\n[5.3 Saran] Rekomendasi praktis untuk stakeholder. Agenda penelitian lanjutan yang merinci arah studi mendatang.', description: 'Ringkasan, keterbatasan, dan rekomendasi' }
    ],
    aiPrompt: 'Tulis makalah akademik lengkap dengan struktur: Abstrak (IMRAD), Bab I Pendahuluan, Bab II Tinjauan Pustaka, Bab III Metodologi, Bab IV Hasil dan Pembahasan, Bab V Kesimpulan. Gunakan format akademik formal dengan referensi APA/IEEE. Fokus pada: struktur logis, bahasa pasif formal, argumentasi berbasis bukti, dan analisis kritis.'
  },
  article: {
    id: 'article',
    name: 'Artikel',
    icon: '📰',
    description: 'Artikel untuk publikasi atau blog',
    type: 'article',
    sections: [
      { id: 'headline', title: 'Judul Menarik', placeholder: '[Headline Formula] Gunakan: angka spesifik ("5 Strategi..."), benefit jelas ("...untuk Produktivitas Maksimal"), atau curiosity gap ("Rahasia yang Jarang Diketahui..."). Hindari: judul generic seperti "Tentang..." atau "Studi...".', description: 'Headline yang menarik perhatian' },
      { id: 'lead', title: 'Lead / Pembuka', placeholder: '[The Hook] Buka dengan: story personal, statistik mencengangkan, pertanyaan menggugah, atau kontradiksi umum. Target: pembaca harus merasa "ini tentang saya" atau "saya perlu tahu ini".\n\n[The Promise] Janjikan apa yang akan pembaca dapatkan setelah membaca artikel ini.\n\n[Preview] Berikan roadmap singkat: "Dalam artikel ini, kita akan membahas 3 pendekatan..."', description: 'Hook pembaca dalam 3-5 kalimat pertama' },
      { id: 'body', title: 'Isi Artikel', placeholder: '[H2: Point Utama 1] Mulai dengan subjudul yang jelas. Gunakan: opening sentence yang mengajak, contoh konkret/cerita, dan takeaway yang actionable.\n\n[H2: Point Utama 2] Setiap seksi harus bisa berdiri sendiri (self-contained). Gunakan bullet points untuk readability.\n\n[H2: Point Utama 3] Tambahkan kutipan ahli, data, atau case study untuk kredibilitas.\n\n[Transisi Antar Seksi] Gunakan phrase penghubung: "Lebih jauh lagi...", "Namun, ada aspek lain...", "Yang tak kalah penting..."', description: 'Konten utama dengan struktur skimmable' },
      { id: 'cta', title: 'Penutup & Call to Action', placeholder: '[Summary Value] Ulangi 1-2 insight terpenting yang harus diingat pembaca.\n\n[Motivational Close] Tutup dengan kalimat yang menginspirasi action atau refleksi.\n\n[CTA Specific] Ajak pembaca: komen pengalaman mereka, share artikel, download resource, atau ikuti langkah konkret. Hindari CTA generic seperti "tulis di kolom komentar".', description: 'Closing yang memorable dan actionable' }
    ],
    aiPrompt: 'Tulis artikel engaging dengan: 1) Judul catchy menggunakan formula headline, 2) Lead kuat dengan hook emosional atau data, 3) Body dengan subjudul H2 jelas dan poin actionable, 4) Penutup memotivasi dengan CTA spesifik. Gunakan paragraf pendek (2-3 kalimat), bullet points, dan bahasa conversational-informatif.'
  },
  journal: {
    id: 'journal',
    name: 'Jurnal Harian',
    icon: '📔',
    description: 'Catatan pribadi atau refleksi dengan struktur guided',
    type: 'journal',
    sections: [
      { id: 'date', title: 'Tanggal & Konteks', placeholder: '[Header] Hari, Tanggal: ___/___/_____\n\n[Mood Meter] Kondisi emosional: 😊 Baik / 😐 Biasa / 😔 Kurang / 😰 Stres / 🤩 Produktif\n\n[Energy Level] Tingkat energi: 🔋 Tinggi / ⚡ Sedang / 🔌 Rendah\n\n[Fokus Utama] Satu hal yang paling penting hari ini: _______________', description: 'Konteks waktu, mood, dan energi' },
      { id: 'morning', title: 'Intensi & Rencana', placeholder: '[Morning Intention] "Hari ini saya ingin menjadi..." (sifat/qualities yang ingin diaktifkan).\n\n[Prioritas 3] 3 hal yang harus diselesaikan hari ini:\n1. _______________\n2. _______________\n3. _______________\n\n[Mindset] Satu affirmasi atau mindset yang ingin dipegang sepanjang hari.', description: 'Intensi pagi dan prioritization' },
      { id: 'experience', title: 'Pengalaman & Narasi', placeholder: '[What Happened] Ceritakan 1-2 peristiwa penting yang terjadi hari ini secara kronologis.\n\n[Who I Was With] Orang-orang yang berinteraksi dengan Anda dan dinamika yang terjadi.\n\n[What I Learned] Satu insight, skill baru, atau pembelajaran yang didapat.\n\n[Challenges] Hambatan atau kesulitan yang dihadapi dan bagaimana Anda meresponsnya.', description: 'Cerita dan pengalaman harian' },
      { id: 'gratitude', title: 'Gratitude & Apresiasi', placeholder: '[3 Good Things] 3 hal baik yang terjadi hari ini:\n1. _______________\n2. _______________\n3. _______________\n\n[Someone to Thank] Satu orang yang berkontribusi positif hari ini dan mengapa.\n\n[Small Wins] Pencapaian kecil yang patut dirayakan (menyelesaikan tugas, membuat orang lain tersenyum, dll).', description: 'Gratitude log dan small wins' },
      { id: 'reflection', title: 'Refleksi Malam', placeholder: '[Day Rating] Rate hari ini: ⭐⭐⭐⭐⭐ (1-5) dan alasannya.\n\n[Would Do Differently] Satu hal yang akan dilakukan berbeda jika hari ini diulang.\n\n[Tomorrow\'s Focus] Satu prioritas utama untuk besok.\n\n[Letter to Self] Satu kalimat penutup untuk diri sendiri hari ini.', description: 'Evaluasi dan penutup hari' }
    ],
    aiPrompt: 'Tulis jurnal reflektif terstruktur dengan: konteks mood dan energi, morning intention dengan 3 prioritas, narasi pengalaman dengan focus on learning, gratitude log dengan 3 good things, dan evening reflection dengan rating dan self-compassion letter. Gunakan tone personal, supportive, dan growth-oriented. Hindari toxic positivity - akui kesulitan secara jujur.'
  },
  research: {
    id: 'research',
    name: 'Laporan Penelitian',
    icon: '🔬',
    description: 'Format laporan penelitian ilmiah',
    type: 'thesis',
    sections: [
      { id: 'title', title: 'Judul Penelitian', placeholder: '[Formula Judul Riset] "[Pengaruh/Dampak/Hubungan] [Variabel Independen] terhadap [Variabel Dependen] pada [Konteks/Sampel]". Contoh: "Efektivitas Model Pembelajaran Daring terhadap Hasil Belajar Siswa SMA di Jakarta".\n\n[Kriteria] Spesifik, mengindikasikan hubungan, mencakup populasi/target.', description: 'Judul spesifik dengan variabel dan konteks' },
      { id: 'abstract', title: 'Abstrak', placeholder: '[Background] Konteks masalah dalam 1-2 kalimat dengan statistik/fakta pendukung.\n\n[Objective] Tujuan spesifik dalam format: "Penelitian ini bertujuan untuk..."\n\n[Methods] Desain, sampel (n=...), lokasi, waktu, instrumen, dan teknik analisis.\n\n[Key Findings] Temuan utama dalam angka/persentase atau tema dominan.\n\n[Conclusion] Implikasi hasil untuk praktik atau kebijakan.', description: 'Ringkasan struktur IMRAD 150-200 kata' },
      { id: 'problem', title: 'Identifikasi Masalah', placeholder: '[Phenomenon Gap] Deskripsikan fenomena yang diamati dengan data pendukung. Tunjukkan inkonsistensi atau kesenjangan literatur.\n\n[Research Questions] 1-3 pertanyaan spesifik yang terukur dan terjawab.\n\n[Hypothesis] (jika kuantitatif) Pernyataan prediktif tentang hubungan variabel: "Ha: Terdapat pengaruh signifikan..."\n\n[Scope & Limitation] Batasan penelitian (variabel, lokasi, waktu) dan keterbatasan yang diakui.', description: 'Gap, research questions, dan hipotesis' },
      { id: 'method', title: 'Metodologi', placeholder: '[Research Design] Kualitatif: fenomenologi, grounded theory, studi kasus. Kuantitatif: eksperimen, survei correlational, quasi-eksperimen.\n\n[Data Collection] Teknik: wawancara mendalam, FGD, observasi partisipatif, kuesioner, dokumentasi. Proses sampling dan jumlah partisipan.\n\n[Instruments] Validasi instrumen (expert judgment, pilot test). Uji reliabilitas (Alpha Cronbach untuk kuantitatif, triangulasi untuk kualitatif).\n\n[Data Analysis] Teknik: Miles & Huberman (reduksi, display, verification), statistik deskriptif, regresi, ANOVA, tema-tema tematik.', description: 'Desain, instrumen, dan analisis data' },
      { id: 'findings', title: 'Temuan & Analisis', placeholder: '[Data Presentation] Tabel frekuensi/distribusi, grafik trend, atau kutipan naratif representatif.\n\n[Thematic Analysis] (Kualitatif) Tema-tema emergen dengan sub-tema dan evidence (kutipan langsung).\n\n[Statistical Results] (Kuantitatif) Uji asumsi, uji hipotesis dengan nilai p, koefisien determinasi (R²), dan signifikansi.\n\n[Interpretation] Arti hasil dalam konteks teori dan penelitian terdahulu. Jelaskan unexpected findings.', description: 'Presentasi dan interpretasi data' },
      { id: 'conclusion', title: 'Kesimpulan & Rekomendasi', placeholder: '[Answer to RQ] Ringkasan jawaban langsung terhadap setiap research question berdasarkan data.\n\n[Theoretical Contribution] Bagaimana hasil ini mengkonfirmasi/menge challenge/memperluas teori yang ada.\n\n[Practical Implications] Rekomendasi konkret untuk praktisi, manajer, atau pembuat kebijakan.\n\n[Future Research] Saran studi lanjutan dengan variabel/konteks yang berbeda untuk generalisasi.', description: 'Kesimpulan ilmiah dan agenda riset' }
    ],
    aiPrompt: 'Tulis laporan penelitian ilmiah dengan: Judul spesifik dengan variabel, Abstrak IMRAD, Identifikasi Masalah dengan gap yang jelas, Metodologi dengan detail sampling dan analisis, Temuan dengan data/statistik, Kesimpulan dengan kontribusi teoretis dan praktis. Gunakan bahasa ilmiah formal pasif, struktur logis, dan referensi minimal 15 (70% 10 tahun terakhir).'
  },
  report: {
    id: 'report',
    name: 'Laporan / Proposal',
    icon: '📊',
    description: 'Laporan bisnis atau proposal proyek',
    type: 'article',
    sections: [
      { id: 'summary', title: 'Executive Summary', placeholder: '[Problem Statement] Identifikasi masalah/oportunitas yang dihadapi dalam 2-3 kalimat kuat.\n\n[Proposed Solution] Deskripsikan pendekatan/solusi yang ditawarkan secara singkat.\n\n[Key Benefits] Soroti 3 manfaat utama secara kuantitatif jika memungkinkan (% efisiensi, penghematan biaya, ROI).\n\n[Resource Request] Total budget dan timeline yang dibutuhkan untuk eksekusi.\n\n[Call to Action] Permintaan spesifik: persetujuan, funding, atau persiapan tim.', description: 'Ikhtisar 1 halaman untuk decision maker' },
      { id: 'background', title: 'Latar Belakang & Konteks', placeholder: '[Current Situation] Gambaran kondisi existing dengan data pendukung (grafik tren, statistik, benchmark).\n\n[Problem/Gap Analysis] Identifikasi celah antara current state dan desired state. Jelaskan implikasi tidak bertindak.\n\n[Opportunity] Deskripsikan potensi positif jika proyek ini dieksekusi dengan sukses.\n\n[Stakeholders] Identifikasi pihak terdampak dan kepentingan mereka.', description: 'Mengapa proyek ini diperlukan' },
      { id: 'objectives', title: 'Tujuan & Target (SMART)', placeholder: '[Specific] Apa yang akan dicapai secara spesifik (deliverables)?\n\n[Measurable] Metrik keberhasilan dan KPI yang akan dipantau (angka/target kuantitatif).\n\n[Achievable] Bukti kelayakan berdasarkan resource dan kapasitas tim.\n\n[Relevant] Alignment dengan tujuan strategis organisasi/lembaga.\n\n[Time-bound] Deadline jelas untuk setiap milestone utama.', description: 'Objective yang SMART dan terukur' },
      { id: 'approach', title: 'Strategi & Metodologi', placeholder: '[Strategic Framework] Metode/kerangka yang digunakan (design thinking, lean, agile, waterfall, dll).\n\n[Implementation Plan] Tahapan eksekusi detail dengan aktivitas spesifik per fase.\n\n[Key Activities] 5-7 aktivitas kritis yang harus dilakukan untuk keberhasilan.\n\n[Risk Mitigation] Identifikasi 3-5 risiko utama dan strategi mitigasinya.', description: 'Bagaimana proyek akan dieksekusi' },
      { id: 'timeline', title: 'Timeline & Milestone', placeholder: '[Gantt/Phase Overview] Fase-fase utama dengan durasi dan dependensi antar aktivitas.\n\n[Milestone Key] 4-6 milestone kritis yang menandakan progress signifikan.\n\n[Deliverables per Phase] Output spesifik yang dihasilkan di setiap fase.\n\n[Review Points] Jadwal check-in/monitoring untuk stakeholder update.', description: 'Rencana waktu dan milestone' },
      { id: 'budget', title: 'Anggaran & Sumber Daya', placeholder: '[Cost Breakdown] Rincian biaya per kategori: personnel, equipment, operational, contingency (10-15%).\n\n[Resource Requirements] SDM (role dan FTE), tools/technology, facilities, external vendor.\n\n[ROI/Value Proposition] Proyeksi return/penghematan/benefit yang akan dihasilkan.\n\n[Funding Strategy] Sumber dana yang akan digunakan dan mekanisme pengalokasian.', description: 'Kebutuhan resource dan alokasi budget' }
    ],
    aiPrompt: 'Tulis laporan/proposal bisnis profesional dengan struktur: Executive Summary (problem-solution-benefits), Latar Belakang dengan data analisis, Tujuan SMART terukur, Strategi dengan risk mitigation, Timeline dengan milestone kritis, Anggaran dengan ROI justification. Gunakan bahasa profesional-persuasif, format terstruktur, dan fokus pada actionable outcomes untuk stakeholder.'
  }
};

export interface WritingStats {
  words: number;
  chars: number;
  sentences: number;
  paragraphs: number;
  readingTime: number; // dalam menit
}

export interface StreakData {
  current: number;
  longest: number;
  lastWriteDate: string;
  daysHistory: boolean[]; // 7 hari terakhir
}

export interface DailyTarget {
  words: number;
  current: number;
}

export interface ChiMood {
  type: 'idle' | 'thinking' | 'proud' | 'concerned' | 'happy' | 'sleepy' | 'excited' | 'celebrating' | 'bored' | 'worried' | 'shocked' | 'welcome_back';
  comment: string;
}

export interface TokenUsage {
  planId: 'free' | 'daily-12k' | 'weekly-25k' | 'biweekly-49k';
  planName: string;
  autoGenerateRemaining: number;
  autoGenerateTotal: number;
  promptRemaining: number;
  promptTotal: number;
  planExpiresAt: string | null;
  isExpired: boolean;
}

export interface AIDetection {
  score: number;
  ranges: { start: number; end: number; score: number }[];
}

export interface PlagiarismDetection {
  score: number;
  ranges: { start: number; end: number; score: number; source?: string }[];
}

export interface Citation {
  id: string;
  number: number;
  text: string;
  author: string;
  year: number;
  source: string;
}

export interface AutoGenerateRequest {
  topic: string;
  type: DocumentType;
  length: 'short' | 'medium' | 'long';
}

export interface GeminiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface AnalysisPanel {
  strengths: string;
  weaknesses: string;
  rationale: string;
  methodology: string;
  implications: string;
  contribution: string;
  deeperAspects: string;
}

// Format Bar Types
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type LineSpacing = '1' | '1.15' | '1.5' | '2';

export interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  align: TextAlign;
  fontSize: string;
  lineSpacing: LineSpacing;
  subscript: boolean;
  superscript: boolean;
  fontFamily: string;
}