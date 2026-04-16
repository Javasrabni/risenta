import { NextRequest, NextResponse } from 'next/server';
import { checkAIUsage, decrementAIUsage, getAuthFromCookie } from '@/lib/aiUsage';
import RisentaAdm from '@/app/models/risentaAdm';
import { cookies } from 'next/headers';
import Customer from '@/app/models/customer';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { prompt, type, topic, length, currentContent, templatePrompt } = await req.json();

    const cookieStore = await cookies();
    const customerSession = cookieStore.get('customer_session')?.value;
    const customerId = cookieStore.get('customer_id')?.value;
    const adminToken = cookieStore.get('session_token')?.value;
    const guestId = req.headers.get('x-guest-id');

    let auth: { type: 'customer'; customerID: string } | { type: 'admin'; sessionToken: string } | null = null;

    if (customerSession && customerId && customerSession.startsWith(`customer_${customerId}_`)) {
      auth = { type: 'customer', customerID: customerId };
    } else if (adminToken) {
      auth = { type: 'admin', sessionToken: adminToken };
    }

    // Allow guest users with limited access
    const isGuest = !auth && !!guestId;

    if (!auth && !isGuest) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    // Determine action type for usage tracking
    const actionType = type === 'auto-generate' ? 'auto-generate' : 'prompt';

    let isAdmin = false;
    let customerID: string | null = null;

    if (isGuest) {
      if (type === 'auto-generate') {
        return NextResponse.json(
          { success: false, error: 'Login atau daftar untuk menggunakan Auto-Generate.' },
          { status: 403 }
        );
      }
    } else if (auth && auth.type === 'admin') {
      // Verify admin and allow unlimited access
      const admin = await RisentaAdm.findOne({ token: auth.sessionToken });
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Invalid admin session.' },
          { status: 401 }
        );
      }
      isAdmin = true;
    } else {
      customerID = auth.customerID;
      // Check usage limits for customers
      const usageCheck = await checkAIUsage(customerID, actionType);
      if (!usageCheck.allowed) {
        return NextResponse.json(
          { success: false, error: usageCheck.error || 'Kuota AI Anda telah habis.' },
          { status: 403 }
        );
      }
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key tidak dikonfigurasi' },
        { status: 500 }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'auto-generate') {
      // Academic-standard auto-generate prompt
      systemPrompt = `Anda adalah Profesor Emeritus dengan pengalaman 30+ tahun dalam penulisan akademis internasional. Anda telah menjadi editor jurnal terindeks Scopus dan memahami standar rigor akademik tertinggi. Tugas Anda adalah menghasilkan tulisan akademis yang memenuhi kriteria penerbitan jurnal bereputasi internasional (Q1/Q2).`;
      
      // Use template prompt if provided, otherwise use default academic prompt
      if (templatePrompt) {
        userPrompt = templatePrompt;
      } else {
        userPrompt = `Tugas: Komposisi Artikel Akademis Standar Internasional

TOPIK: "${topic}"

PANJANG: ${length === 'short' ? '1.500-2.000' : length === 'medium' ? '2.500-3.500' : '4.000-5.000'} kata

STANDAR AKADEMIK YANG WAJIB DIPENUHI:
1. Struktur IMRaD (Introduction, Methods, Results, and Discussion) atau setara untuk bidang non-eksperimental
2. Bahasa Indonesia formal akademik dengan register tinggi (bukan konversational)
3. Paragraf yang koheren dengan topic sentence, supporting evidence, dan concluding sentence
4. Penggunaan cohesive devices (furthermore, consequently, in contrast, notably, significantly)
5. Hindari: klise akademik ("dalam era modern", "tidak dapat dipungkiri"), language padding, subjectivity tanpa data

STRUKTUR WAJIB:
<h1>JUDUL</h1> - Spesifik, deskriptif, menarik. Hindari: "Studi tentang...", "Pengaruh...". Gunakan: "[Variabel] dalam Konteks [Konteks]: [Aspek Spesifik]"

<h2>ABSTRAK</h2> - 150-200 kata. Struktur: Background (20%), Objective (15%), Methods (20%), Results (25%), Conclusion (20%). Keywords: 3-5 istilah.

<h2>1. PENDAHULUAN</h2>
- 1.1 Latar Belakang: Kontekstualisasi masalah dengan data/argumen kuat
- 1.2 Rumusan Masalah: Gap research yang jelas, research questions spesifik
- 1.3 Tujuan Penelitian: Aligned dengan rumusan masalah
- 1.4 Signifikansi: Kontribusi teoritis dan praktis

<h2>2. TINJAUAN PUSTAKA</h2>
- Synthesis, bukan summary daftar referensi
- Identifikasi teori dominan dan gapnya
- Kerangka konseptual/teoritis yang terintegrasi

<h2>3. METODOLOGI</h2> (jika relevan)
- Design: Kualitatif/kuantitatif/mixed, jenis studi
- Participants/Sample: Karakteristik, teknik sampling
- Instruments: Validitas dan reliabilitas
- Procedures: Langkah sistematis
- Analysis: Teknik analisis data

<h2>4. HASIL DAN PEMBAHASAN</h2>
- Presentasi tematik/hipotesis
- Interpretasi dengan kaitan teori
- Perbandingan dengan studi sebelumnya
- Implikasi teoretis dan praktis

<h2>5. KESIMPULAN</h2>
- Ringkasan jawaban terhadap research questions
- Kontribusi pengetahuan
- Limitasi dan rekomendasi riset lanjutan

<h2>DAFTAR PUSTAKA</h2>
- Minimal 15 referensi (70% dari 10 tahun terakhir, 40% internasional)
- Format: APA 7th Edition / IEEE tergantung disiplin

OUTPUT FORMAT:
Gunakan tag HTML semantik dengan class akademis:
- <h1> untuk judul utama
- <h2> untuk section headings
- <h3> untuk subsection
- <p class="abstract"> untuk abstrak
- <p class="body-text"> untuk paragraf isi
- <blockquote class="citation"> untuk kutipan
- <ul class="references"> untuk daftar pustaka

JANGAN gunakan:
- Bullet points dalam paragraf akademis (kecuali daftar pustaka)
- Emoji atau informal language
- "Kita", "Anda", "Saya" - gunakan pasif formal
- Klise seperti "Dalam era globalisasi", "Tidak dapat dipungkiri"

HASILKAN ARTIKEL DENGAN KUALITAS PUBLIKASI JURNAL TERINDEKS.`;
      }
    } else if (type === 'improve') {
      systemPrompt = `Anda adalah Executive Editor jurnal akademis terindeks Scopus dengan spesialisasi academic writing development. Anda menggunakan framework Academic Writing Quality Assessment (AWQA) yang mengevaluasi 12 dimensi: coherence, cohesion, lexical sophistication, syntactic complexity, argumentation strength, evidence integration, theoretical grounding, methodological rigor, analytical depth, critical thinking, academic register, dan citation practices.`;
      
      userPrompt = `TUGAS: ACADEMIC WRITING ENHANCEMENT - COMPREHENSIVE EDITING

TEKS ASLI:
${prompt}

ANALISIS DAN REVISI WAJIB:

A. STRUKTURAL (Structural Enhancement)
1. Identifikasi dan perbaiki:
   - Topic sentence yang lemah atau tidak ada
   - Development pattern yang tidak konsisten (general-specific, problem-solution, cause-effect)
   - Concluding sentence yang tidak menyimpulkan atau memiliki "so what?"
2. Pastikan setiap paragraf memiliki: Topic Sentence → Supporting Evidence → Analysis → Concluding Sentence

B. KOHERENSI DAN KOJESI (Coherence & Cohesion)
1. Gunakan transitional phrases yang tepat:
   - Aditif: furthermore, moreover, additionally, in addition
   - Kontrastif: however, conversely, in contrast, nevertheless
   - Kausal: consequently, therefore, thus, as a result
   - Temporal: subsequently, meanwhile, thereafter
   - Emfatik: notably, significantly, importantly, indeed
2. Perbaiki referensi pronomina yang ambigu (it, this, they)
3. Gunakan lexical cohesion: repetition strategis, synonymy, antonymy, hyponymy, collocation

C. REGISTER AKADEMIK (Academic Register Elevation)
1. Ganti conversational phrases:
   - "banyak" → "substantial", "considerable", "significant proportion"
   - "bagus" → "optimal", "effective", "efficacious"
   - "makin" → "increasingly", "progressively", "incrementally"
   - "susah" → "challenging", "problematic", "formidable"
   - "penting" → "crucial", "pivotal", "paramount", "imperative"
2. Hindari hedging yang berlebihan ("maybe", "perhaps", "kind of")
3. Hindari intensifier yang lemah ("very", "really", "quite")

D. SINTAKSIS DAN GAYA (Syntactic Sophistication)
1. Variasikan struktur kalimat:
   - Simple → Compound → Complex → Compound-complex
   - Gunakan participial phrases, relative clauses, adverbial clauses
2. Perbaiki wordiness (eliminasi tautologi, redundancy, empty phrases)
3. Perbaiki nominalization yang tepat untuk register akademik

E. ARGUMENTASI DAN BUKTI (Argumentation & Evidence)
1. Strengthen claims dengan evidence markers
2. Tambahkan counter-argument acknowledgment (jika relevan)
3. Pastikan ada logical progression: Premise → Evidence → Warrant → Backing → Qualifier

F. ETIKA DAN KEBENARAN (Academic Integrity)
1. Perbaiki attribution ("Menurut X (2020)...")
2. Pastikan epistemic stance yang tepat ("suggests" vs "proves" vs "indicates")
3. Hindari plagiarism paraphrasing

OUTPUT FORMAT:
<h2>VERSI REVISI AKADEMIS</h2>
[Hasil revisi lengkap]

<h3>PERUBAHAN SIGNIFIKAN</h3>
<ul>
<li>[Deskripsi perubahan 1]</li>
<li>[Deskripsi perubahan 2]</li>
</ul>

JANGAN berikan komentar atau penjelasan panjang selain format di atas.`;
    } else if (type === 'paraphrase') {
      systemPrompt = `Anda adalah ahli parafrase yang dapat mengubah teks dengan tetap mempertahankan makna aslinya.`;
      userPrompt = `Parafrasekan teks berikut dengan gaya bahasa yang berbeda namun tetap mempertahankan makna:\n\n${prompt}`;
    } else if (type === 'expand') {
      systemPrompt = `Anda adalah penulis yang ahli dalam mengembangkan ide menjadi pembahasan yang lebih detail.`;
      userPrompt = `Kembangkan teks berikut menjadi lebih detail dan mendalam:\n\n${prompt}`;
    } else if (type === 'summarize') {
      systemPrompt = `Anda adalah ahli dalam membuat ringkasan yang padat namun informatif.`;
      userPrompt = `Buatlah ringkasan dari teks berikut:\n\n${prompt}`;
    } else if (type === 'canvas-prompt') {
      systemPrompt = `Anda adalah asisten penulisan akademis. Tugas Anda adalah menghasilkan konten berkualitas tinggi berdasarkan instruksi pengguna dan konteks dokumen. Gunakan bahasa Indonesia formal akademis.`;
      
      userPrompt = `Konteks dokumen saat ini:
${currentContent || 'Belum ada konten.'}

Instruksi pengguna: ${prompt}

PERATURAN PENTING:
1. Jika instruksi tentang margin/format/halaman, berikan respons konfirmasi dalam BAHASA NATURAL saja: "Margin telah diatur menjadi..." atau "Baik, saya akan mengatur..." - JANGAN output JSON atau kode.
2. Jika instruksi tentang menulis/melanjutkan konten, buat paragraf akademis yang koheren dalam format HTML: <p>, <h2>, <h3>, dll.
3. Jika instruksi tentang kutipan/referensi, integrasikan dengan format akademis yang benar.
4. JANGAN tulis "MODE:", "Analisis:", "Output:", atau label meta serupa.
5. JANGAN jelaskan apa yang Anda lakukan.
6. LANGSUNG berikan hasil final saja.

Hasil:`;
    } else {
      userPrompt = prompt;
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Risenta Write',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'Anda adalah asisten penulisan akademis yang membantu meningkatkan kualitas tulisan.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: type === 'auto-generate' ? 4000 : 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API Error:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error?.message || 'Gagal mendapatkan respons dari AI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';

    // Decrement usage on successful response (only for customers)
    if (!isAdmin && customerID) {
      await decrementAIUsage(customerID, actionType, true, {
        prompt: userPrompt.substring(0, 500),
        responseLength: generatedText.length,
        topic,
        template: type,
      });
    }

    return NextResponse.json({
      success: true,
      content: generatedText,
      remainingQuota: isAdmin ? -1 : undefined,
    });

  } catch (error) {
    console.error('Error in OpenRouter API:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan internal' },
      { status: 500 }
    );
  }
}
