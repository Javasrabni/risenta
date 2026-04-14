import { NextRequest, NextResponse } from 'next/server';
import { checkAIUsage, decrementAIUsage, getAuthFromCookie } from '@/lib/aiUsage';
import RisentaAdm from '@/app/models/risentaAdm';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const { prompt, type, topic, length, currentContent, content, templatePrompt } = reqBody;

    // Check authentication (customer, admin, or guest)
    const cookieHeader = req.headers.get('cookie');
    const guestId = req.headers.get('x-guest-id');
    
    const auth = getAuthFromCookie(cookieHeader);

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
      // Guest users: limited access, no auto-generate
      if (type === 'auto-generate') {
        return NextResponse.json(
          { success: false, error: 'Login atau daftar untuk menggunakan Auto-Generate.' },
          { status: 403 }
        );
      }
      // Allow basic prompt usage for guests (no quota tracking)
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
    } else if (auth && auth.type === 'customer') {
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

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key tidak dikonfigurasi' },
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
      systemPrompt = `Anda adalah ahli academic paraphrasing dengan keahlian dalam syntactic transformation, lexical substitution, dan discourse restructuring. Anda memahami teknik parafrase akademis: 1) Active-passive transformation, 2) Nominalization-denominalization, 3) Cleft sentences, 4) Participial phrase conversion, 5) Synonymy dengan mempertahankan register akademis, 6) Syntactic restructuring tanpa mengubah propositional content.`;
      
      userPrompt = `TUGAS: ACADEMIC PARAPHRASING - ADVANCED TEXTUAL TRANSFORMATION

TEKS SUMBER:
${prompt}

TEKNIK PARAFRASE WAJIB (gunakan kombinasi):
1. Voice alternation: Active ↔ Passive
   Contoh: "Penelitian ini menganalisis" ↔ "Dalam penelitian ini dianalisis"

2. Nominalization strategies:
   "Hasil menunjukkan bahwa siswa belajar" → "Temuan mengindikasikan adanya pembelajaran siswa"

3. Cleft sentence construction:
   "Faktor utama adalah motivasi" → "Yang merupakan faktor utama adalah motivasi"

4. Participial phrase usage:
   "Karena menghadapi tantangan, guru..." → "Menghadapi tantangan, guru..."

5. Lexical sophistication (ganti dengan sinonim akademis):
   - "menunjukkan" → "mengindikasikan", "mendemonstrasikan", "mengkonfirmasi"
   - "penting" → "signifikan", "kritis", "paramount"
   - "menggunakan" → "memanfaatkan", "mengimplementasikan", "mengaplikasikan"

6. Syntactic restructuring:
   "Penelitian terdahulu menemukan bahwa..." → "Temuan dari studi-studi sebelumnya mengindikasikan..."

KETENTUAN:
- Pertahankan semua referensi dan tahun publikasi
- Pertahankan terminologi teknis (tidak perlu diubah)
- Pertahankan struktur argumen dan urutan logis
- Gunakan register akademis yang SETARA atau LEBIH TINGGI dari teks asli
- Hindari merubah makna nuances (nuansa penjelasan, degree of certainty)
- Hindari merubah: statistics, dates, names, specific terms

OUTPUT:
<h3>PARAFRASE AKADEMIS</h3>
[Hasil parafrase dalam bahasa Indonesia formal akademis, dengan struktur HTML <p>]

JANGAN berikan penjelasan atau analisis perubahan.`;
    } else if (type === 'expand') {
      systemPrompt = `Anda adalah academic development editor yang mengkhususkan diri dalam elaborasi argumentasi, evidence integration, dan theoretical grounding. Anda menggunakan framework EXPAND (Elaboration, eXamples, Proof, Analysis, Nuance, Depth) untuk mengembangkan ide akademis secara komprehensif.`;
      
      userPrompt = `TUGAS: ACADEMIC TEXT EXPANSION - DEEPENING AND ELABORATION

TEKS YANG PERLU DIKEMBANGKAN:
${prompt}

FRAMEWORK PENGEMBANGAN:

A. ELABORATION (Pengembangan Konseptual)
1. Definisi operasional: Jelaskan bagaimana konsep ini dioperasionalkan dalam konteks spesifik
2. Theoretical grounding: Hubungkan dengan teori/teori yang relevan (sebutkan teorinya dan tokohnya)
3. Conceptual framework: Jelaskan relasi antar konsep dalam kerangka berpikir

B. EXEMPLES (Ilustrasi Konkret)
1. Empirical examples: Contoh penelitian empiris yang mendemonstrasikan fenomena ini
2. Hypothetical scenarios: Skenario ilustratif untuk memperjelas konsep abstrak
3. Cross-contextual examples: Contoh dari berbagai konteks (geografis, disiplin, temporal)

C. PROOF (Evidence Integration)
1. Statistical evidence: Data kuantitatif yang mendukung (jika tersedia dalam domain)
2. Qualitative findings: Temuan studi kualitatif yang relevan
3. Expert testimonies: Kutipan dari otoritas dalam bidang tersebut
4. Meta-analytic findings: Temuan dari systematic reviews atau meta-analyses

D. ANALYSIS (Pengolahan Argumentatif)
1. Causal mechanisms: Mekanisme kausal yang menjelaskan hubungan fenomena
2. Moderating factors: Faktor-faktor yang memperkuat/memperlemah hubungan
3. Conditional relationships: "Under what conditions..." analysis
4. Comparative analysis: Perbandingan dengan fenomena/fenomena sejenis

E. NUANCE (Nuansa Akademis)
1. Boundary conditions: Batasan aplikabilitas argumentasi
2. Contextual variations: Variasi dalam konteks berbeda
3. Temporal considerations: Evolusi konsep/fenomena sepanjang waktu
4. Contingent factors: Faktor-faktor yang membuat generalisasi terbatas

F. DEPTH (Kedalaman Analitis)
1. Critical examination: Kritik terhadap asumsi-asumsi yang mendasari
2. Alternative interpretations: Interpretasi alternatif dari fenomena
3. Methodological considerations: Implikasi metodologis dari argumentasi
4. Implications cascade: Rantai implikasi (teoretis → metodologis → praktis → policy)

ACADEMIC REGISTER WAJIB:
- Gunakan nominalization (penggunaan kata benda dari kata kerja)
- Gunakan passive voice strategis untuk objektivitas
- Gunakan hedging yang tepat ("suggests", "indicates", "appears to") 
- Gunakan attribution yang akurat ("According to X (2020), ...")

PANJANG TARGET: 3-5x dari teks asli

OUTPUT:
<h2>TEKS YANG TELAH DIKEMBANGKAN</h2>
[Hasil pengembangan dengan struktur akademis jelas]`;
    } else if (type === 'summarize') {
      systemPrompt = `Anda adalah academic abstract specialist yang mengkhususkan diri dalam information condensation sambil mempertahankan epistemic value dan propositional content. Anda menggunakan teknik academic summarization: 1) Propositional reduction, 2) Discourse reconstruction, 3) Macro-structure identification, 4) Salient point extraction, 5) Nominalization for density, 6) Hedging preservation.`;
      
      userPrompt = `TUGAS: ACADEMIC SUMMARIZATION - INFORMATION CONDENSATION

TEKS SUMBER:
${prompt}

TEKNIK SUMARISASI AKADEMIS:

A. STRUCTURAL ANALYSIS
1. Identifikasi macro-structure: IMRaD, Problem-Solution, Compare-Contrast, dll
2. Ekstrak: Research question/Hypothesis, Methodology key points, Major findings, Primary conclusion, Implications

B. PROPOSITIONAL REDUCTION
1. Gabungkan kalimat terkait dengan nominalization
   Contoh: "Penelitian menggunakan survey. Survey dilakukan kepada 100 responden." → "Penggunaan survey terhadap 100 responden"
2. Ubah subordinate clauses menjadi prepositional phrases
   Contoh: "Ketika kita menganalisis data, kita menemukan..." → "Analisis data mengindikasikan..."
3. Hapus redundancy dan tautologi tanpa kehilangan makna kunci

C. DISCOURSE RECONSTRUCTION
1. Susun alinea dengan topic sentences yang kuat
2. Gunakan cohesive devices untuk menjaga flow logis
3. Pertahankan epistemic stance (degree of certainty) dari teks asli

D. REGISTER PRESERVATION
1. Pertahankan terminologi teknis
2. Gunakan academic register tinggi (bukan simplifikasi conversational)
3. Pertahankan hedging yang sesuai (jangan ubah "suggests" menjadi "proves")

RATIO KOMPRESI TARGET:
- Ringkas (30-40% dari asli): Untuk executive summary
- Abstrak (10-15% dari asli): Untuk academic abstract  
- Micro-summary (5-10% dari asli): Untuk conference abstract

ACADEMIC QUALITY INDICATORS:
✓ Apakah main claim tetap tercakup?
✓ Apakah methodology summary akurat?
✓ Apakah key findings teridentifikasi?
✓ Apakah implications tersirat atau eksplisit?

OUTPUT FORMAT:
<h2>ABSTRAK/RINGKASAN AKADEMIS</h2>
<p class="summary-text">[Ringkasan dalam paragraf padat, 1-3 paragraf tergantung panjang asli]</p>

<h3>POINTS CLÉS</h3>
<ul class="key-points">
<li><strong>Objektif:</strong> [Research question/goal]</li>
<li><strong>Metode:</strong> [Methodology summary]</li>
<li><strong>Temuan Utama:</strong> [Key findings]</li>
<li><strong>Implikasi:</strong> [Implications]</li>
</ul>`;
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
    } else if (type === 'analyze-content') {
      const analyzeContent = content || '';
      const analyzeTopic = topic || '';
      systemPrompt = `Anda adalah Professor Emeritus dengan pengalaman 30+ tahun sebagai reviewer jurnal akademis internasional (Q1/Q2) dan dosen penguji sidang. Anda ahli dalam Academic Writing Quality Assessment (AWQA) dan Peer Review Framework.`;

      userPrompt = `TUGAS: ANALISIS KOMPREHENSIF TULISAN AKADEMIS

TOPIK: "${analyzeTopic || 'Tidak ditentukan'}"

KONTEN YANG DIANALISIS:
${analyzeContent?.substring(0, 8000) || 'Tidak ada konten'}

ANALISIS YANG HARUS DIHASILKAN (dalam format JSON):

{
  "overallScore": <skor 0-100 berdasarkan kualitas akademis>,
  "strengths": [
    "<kekuatan 1 - deskripsikan aspek positif tulisan>",
    "<kekuatan 2>",
    "<kekuatan 3>"
  ],
  "weaknesses": [
    "<kelemahan 1 - identifikasi celah atau kekurangan>",
    "<kelemahan 2>",
    "<kelemahan 3>"
  ],
  "predictedQuestions": [
    "<pertanyaan 1 yang mungkin ditanyakan dosen/panitia lomba>",
    "<pertanyaan 2>",
    "<pertanyaan 3>",
    "<pertanyaan 4>",
    "<pertanyaan 5>"
  ],
  "recommendations": [
    "<rekomendasi 1 untuk perbaikan tulisan>",
    "<rekomendasi 2>",
    "<rekomendasi 3>"
  ]
}

KRITERIA PENILAIAN:
- Structure & Organization (IMRaD coherence)
- Argumentation Strength (logical flow, evidence)
- Academic Register (formal language, hedging)
- Theoretical Grounding (framework alignment)
- Methodological Rigor (validity, reliability)
- Critical Thinking (analysis depth)
- Citation Practices (attribution accuracy)

INSTRUKSI PENTING:
1. Berikan skor realistis berdasarkan kualitas konten.
2. Identifikasi 3-5 kekuatan spesifik.
3. Identifikasi 3-5 kelemahan konkret.
4. Prediksi 5 pertanyaan kritis yang mungkin ditanyakan.
5. Berikan 3-4 rekomendasi actionable.
6. RESPONS HARUS DALAM FORMAT JSON YANG VALID.`;
    } else {
      // Default prompt
      userPrompt = prompt;
    }

    // Helper function to call OpenRouter as fallback
    const callOpenRouterFallback = async (): Promise<{ success: boolean; content?: string; error?: string }> => {
      if (!OPENROUTER_API_KEY) {
        return { success: false, error: 'OpenRouter API key tidak dikonfigurasi' };
      }

      try {
        const openRouterResponse = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Risenta AI Writing',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite:thinking',
            messages: [
              {
                role: 'system',
                content: systemPrompt || 'Anda adalah asisten penulisan akademis.',
              },
              {
                role: 'user',
                content: userPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: type === 'auto-generate' ? 8192 : 2048,
          }),
        });

        if (!openRouterResponse.ok) {
          const errorData = await openRouterResponse.json().catch(() => ({}));
          console.error('OpenRouter Fallback Error:', errorData);
          return { success: false, error: 'Fallback ke OpenRouter juga gagal' };
        }

        const data = await openRouterResponse.json();
        const generatedText = data.choices?.[0]?.message?.content || '';
        
        return { success: true, content: generatedText };
      } catch (error) {
        console.error('OpenRouter Fallback Exception:', error);
        return { success: false, error: 'Terjadi kesalahan saat fallback ke OpenRouter' };
      }
    };

    // Try Gemini first
    let response;
    try {
      response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: type === 'auto-generate' ? 8192 : 2048,
          },
        }),
      });
    } catch (fetchError) {
      console.error('Gemini Fetch Error:', fetchError);
      // Network error - try fallback
      const fallback = await callOpenRouterFallback();
      if (fallback.success) {
        return NextResponse.json({
          success: true,
          content: fallback.content,
          source: 'openrouter_fallback',
        });
      }
      return NextResponse.json(
        { success: false, error: 'Gagal terhubung ke Gemini dan fallback OpenRouter gagal' },
        { status: 500 }
      );
    }

    // If Gemini returns 429 (rate limit) or any error, fallback to OpenRouter
    if (!response.ok) {
      const status = response.status;
      const errorData = await response.json().catch(() => ({}));
      console.error(`Gemini API Error (${status}):`, errorData);
      
      // Fallback to OpenRouter for rate limit (429) or any other error
      console.log(`Fallback to OpenRouter (Gemini status: ${status})...`);
      const fallback = await callOpenRouterFallback();
      
      if (fallback.success) {
        return NextResponse.json({
          success: true,
          content: fallback.content,
          source: 'openrouter_fallback',
        });
      }
      
      // If fallback also fails, return original error
      return NextResponse.json(
        { success: false, error: `Gemini error (${status}) dan fallback gagal: ${fallback.error}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // For analyze-content type, parse the JSON response
    if (type === 'analyze-content') {
      try {
        // Try to extract JSON from the response
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        return NextResponse.json({
          success: true,
          analysis,
          source: 'gemini',
        });
      } catch (parseError) {
        console.error('Error parsing analysis JSON:', parseError);
        return NextResponse.json({
          success: false,
          error: 'Gagal mem-parse hasil analisis',
          raw: generatedText,
        });
      }
    }

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
      source: 'gemini',
      remainingQuota: isAdmin ? -1 : undefined,
    });

  } catch (error) {
    console.error('Error in API:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan internal' },
      { status: 500 }
    );
  }
}