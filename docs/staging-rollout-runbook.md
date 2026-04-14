# Staging Rollout Runbook (Tiptap Cutover)

## Tujuan
- Memastikan engine Tiptap stabil sebagai jalur utama.
- Memvalidasi performa realtime, AI inline, dan comments sebelum production.

## Prasyarat
- Staging deploy dari branch terbaru.
- Minimal 2 akun user (atau 2 browser profile) untuk uji kolaborasi.
- Satu `documentId` valid untuk stress test.

## Langkah Eksekusi
1. **Deploy staging**
   - Jalankan deploy seperti biasa.
   - Verifikasi halaman `write` bisa dibuka tanpa error runtime.

2. **Validasi smoke test manual**
   - Ikuti checklist di `docs/write-collab-smoke-checklist.md`.
   - Catat hasil pass/fail per item.

3. **Validasi metrik runtime**
   - Hit endpoint: `GET /api/write/metrics`.
   - Pastikan counter update (`ws_doc_update_total`, `ws_cursor_update_total`) bertambah saat sesi kolaborasi aktif.

4. **Load test dasar**
   - Jalankan:
     - `LOADTEST_URL=<staging-url> LOADTEST_DOC_ID=<doc-id> LOADTEST_CLIENTS=10 LOADTEST_DURATION_MS=30000 npm run loadtest:collab`
   - Catat:
     - `updatesPerSecond`
     - error socket/server jika ada

5. **Gate keputusan**
   - Lanjut production hanya jika:
     - tidak ada blocking bug pada smoke test,
     - tidak ada lonjakan error pada metrics,
     - performa pengetikan dan cursor realtime terasa stabil.

## Rollback
- Jika ada regresi kritis:
  - set `NEXT_PUBLIC_NEW_EDITOR_COLLAB_ENGINE=false`,
  - redeploy cepat,
  - lanjutkan investigasi pada branch perbaikan.
