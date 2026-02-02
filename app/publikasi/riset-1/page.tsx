import React from "react";

export default function RisetSatuPage() {
    return (
        <div className="relative min-h-screen bg-[#030303] text-zinc-200 selection:bg-blue-500/30 selection:text-blue-200 font-[inter]">

            {/* Background Dinamis (Animated Gradient) */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" />
                <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-600/10 blur-[100px] animate-bounce" style={{ animationDuration: '8s' }} />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">

                {/* Header Section */}
                <header className="mb-24 space-y-4 p-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Research Publication
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                        Pengaruh Motivasi dan Fatiga Muskular <br />
                        <span className="text-zinc-500 font-medium italic">Pasca-Latihan Beban</span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
                        Studi kuantitatif terhadap mahasiswa UIN Syarif Hidayatullah Jakarta mengenai performa belajar akademik.
                    </p>

                    <div className="pt-6 flex flex-wrap gap-4">
                        <a
                            href="/Assets/pdf/1.pdf"
                            download="Pengaruh Motivasi dan Fatiga Muskular Pasca-Latihan Beban terhadap Performa Belajar Mahasiswa UIN Jakarta"
                            className="group relative flex items-center gap-3 px-6 py-3 bg-white text-black rounded-xl font-bold text-sm transition-all hover:bg-blue-500 hover:text-white active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                            Download (PDF)

                            {/* Glow Effect on Hover */}
                            <div className="absolute inset-0 rounded-xl bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                        </a>

                        <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl font-medium text-sm hover:text-white hover:border-zinc-600 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" x2="12" y1="2" y2="15" />
                            </svg>
                            Share Research
                        </button>
                    </div>
                </header>

                {/* Timeline Content */}
                <div className="space-y-20">

                    {/* SECTION 1: PENULIS & ABSTRAK */}
                    <div className="relative pl-8 md:pl-0 md:grid md:grid-cols-[200px_1fr] gap-12">
                        <div className="hidden md:block text-sm font-medium text-zinc-500 sticky top-10 h-fit uppercase tracking-tighter">
                            Tim Peneliti & Abstrak
                        </div>
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-4 text-sm bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                                <span className="text-blue-400 font-semibold">Javas Anggaraksa Rabbani</span>
                                <span className="text-zinc-600">|</span>
                                <span className="text-blue-400 font-semibold">Rasyid Ali Nurhakim</span>
                                <span className="text-zinc-600">|</span>
                                <span className="text-blue-400 font-semibold">Saskia Hanina Sadiyah</span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed text-lg border-l-2 border-zinc-800 pl-6 py-2">
                                "Hasil penelitian menunjukkan bahwa 55,3% responden memiliki motivasi intrinsik tinggi,
                                namun 38,2% mengalami fatiga muskular tingkat tinggi yang berkorelasi dengan kesulitan konsentrasi."
                            </p>
                        </div>
                    </div>

                    {/* SECTION 2: PENDAHULUAN (Timeline Point) */}
                    <div className="relative pl-8 md:pl-0 md:grid md:grid-cols-[200px_1fr] gap-12">
                        <div className="hidden md:block text-sm font-medium text-zinc-500 sticky top-10 h-fit uppercase tracking-tighter">
                            01. Pendahuluan
                        </div>
                        <div className="prose prose-invert prose-zinc max-w-none">
                            <p>
                                Latihan beban menjadi tren gaya hidup mahasiswa. Namun, latihan intensitas tinggi memicu
                                <span className="text-white font-medium italic underline decoration-blue-500/50"> Central Fatigue</span> (kelelahan sentral).
                                Kondisi ini menurunkan kemampuan sistem saraf pusat dalam mengatur perhatian dan fungsi kognitif eksekutif.
                            </p>
                        </div>
                    </div>

                    {/* SECTION 3: HASIL DATA (Card Style MagicUI) */}
                    <div className="relative pl-8 md:pl-0 md:grid md:grid-cols-[200px_1fr] gap-12">
                        <div className="hidden md:block text-sm font-medium text-zinc-500 sticky top-10 h-fit uppercase tracking-tighter">
                            02. Temuan Riset
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="group relative p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-blue-500/50 transition-colors">
                                <div className="text-3xl font-black text-white mb-1">55.3%</div>
                                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Motivasi Intrinsik Tinggi</p>
                            </div>
                            <div className="group relative p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-red-500/50 transition-colors">
                                <div className="text-3xl font-black text-white mb-1">38.2%</div>
                                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Fatiga Muskular Tinggi</p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: PEMBAHASAN */}
                    <div className="relative pl-8 md:pl-0 md:grid md:grid-cols-[200px_1fr] gap-12">
                        <div className="hidden md:block text-sm font-medium text-zinc-500 sticky top-10 h-fit uppercase tracking-tighter">
                            03. Pembahasan
                        </div>
                        <div className="space-y-6">
                            <p className="text-zinc-400">
                                Responden dengan fatiga tinggi melaporkan hambatan dalam:
                            </p>
                            <ul className="grid grid-cols-1 gap-3 list-none p-0">
                                {["Kesulitan mempertahankan fokus", "Penurunan kecepatan proses informasi", "Hambatan regulasi diri"].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* SECTION 5: KESIMPULAN (Final Point) */}
                    <div className="relative pl-8 md:pl-0 md:grid md:grid-cols-[200px_1fr] gap-12 pb-20">
                        <div className="hidden md:block text-sm font-medium text-zinc-500 sticky top-10 h-fit uppercase tracking-tighter">
                            04. Kesimpulan
                        </div>
                        <div className="bg-gradient-to-br from-zinc-900 to-black p-10 rounded-3xl border border-zinc-800 shadow-2xl">
                            <h3 className="text-2xl font-bold text-white mb-4">Manajemen Pemulihan adalah Kunci.</h3>
                            <p className="text-zinc-400 leading-relaxed italic">
                                Penting bagi mahasiswa untuk mengatur timing latihan dan durasi pemulihan.
                                Jangan biarkan intensitas fisik menguras cadangan energi kognitif sebelum sesi belajar penting.
                            </p>
                            <div className="mt-8 pt-6 border-t border-zinc-800">
                                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em]">Referensi: Robinson et al. (2023), Ryan & Deci (2000), Taylor et al. (2016)</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <footer className="mt-20 py-10 border-t border-zinc-900 text-center">
                    <p className="text-xs text-zinc-600 tracking-[0.4em] font-medium uppercase">
                        Risenta Publications © 2026
                    </p>
                </footer>
            </div>
        </div>
    );
}