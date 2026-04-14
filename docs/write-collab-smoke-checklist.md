# Write+Collab Smoke Test Checklist

Gunakan checklist ini sebelum menghapus engine lama sepenuhnya.

## 1) Editor Core
- [ ] Buka dokumen baru, ketik cepat 2-3 menit, pastikan tidak ada flicker.
- [ ] Paste teks panjang (2k+ kata), scroll dan edit di tengah dokumen.
- [ ] Reload halaman, pastikan konten terakhir tetap sinkron.

## 2) Real-time Collaboration
- [ ] Buka dokumen yang sama di 2 browser berbeda.
- [ ] Ketik bersamaan dari dua sisi, pastikan tidak ada konflik visual.
- [ ] Verifikasi cursor user lain muncul realtime dan bergerak halus.
- [ ] Tutup salah satu tab, pastikan presence/cursor user hilang.

## 3) AI Inline Actions
- [ ] Select paragraf lalu klik `Improve`, hasil menggantikan selection.
- [ ] Coba `Paraphrase` dan `Summarize` pada selection berbeda.
- [ ] Simulasikan error quota/provider, editor tetap usable (tidak freeze).

## 4) Comments Flow
- [ ] Pilih teks lalu buat komentar baru.
- [ ] Balas komentar pada thread.
- [ ] Resolve komentar, status berubah ke resolved.
- [ ] Refresh halaman, komentar dan status tetap konsisten.

## 5) Observability & Load
- [ ] Hit endpoint `GET /api/write/metrics`, data counters/timing terisi.
- [ ] Jalankan load test: `LOADTEST_DOC_ID=<id> npm run loadtest:collab`.
- [ ] Verifikasi tidak ada lonjakan error realtime saat load test.

## 6) Cutover Decision
- [ ] Semua poin di atas lulus pada staging.
- [ ] Lakukan canary release production.
- [ ] Setelah 24-48 jam stabil, hapus path legacy editor.
