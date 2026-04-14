# Collaboration Architecture Comparison

## Target
- Realtime typing harus stabil dan konsisten antar user.
- Perubahan dokumen tidak boleh hilang saat reconnect singkat.
- Presence (cursor/selection) harus responsif tanpa mengganggu sync dokumen.

## Option A - Yjs + Standard Provider (y-websocket)
- **Model**: CRDT (Yjs) dengan protokol standar `y-websocket`.
- **Transport**: WebSocket khusus untuk dokumen.
- **Server role**: relay + persistence snapshot/update.

### Pros
- Integrasi native dengan Tiptap Collaboration extension.
- Konflik edit ditangani CRDT engine yang sudah matang.
- Time-to-stable relatif cepat untuk codebase saat ini.

### Cons
- Perlu service websocket terdedikasi (bukan hanya endpoint HTTP biasa).
- Presence tetap perlu channel terpisah agar fleksibel.

## Option B - OT Server-Authoritative
- **Model**: Operational Transformation dengan urutan operasi ditentukan server.
- **Transport**: WebSocket + operation pipeline custom.
- **Server role**: transform operasi, sequencing, persistence.

### Pros
- Paling mendekati konsep Google Docs.
- Kontrol tinggi untuk aturan transform custom.

### Cons
- Implementasi jauh lebih kompleks.
- Risiko bug konsistensi tinggi saat migrasi dari CRDT.
- Waktu delivery lebih lama.

## Recommendation
- Gunakan **Option A (Yjs + y-websocket provider)** untuk fase delivery saat ini.
- Presence tetap dipisah via socket channel agar bisa throttle/ack terpisah.

## Success Criteria
- p95 propagasi perubahan dokumen < 200ms pada jaringan normal.
- Tidak ada data loss saat reconnect <= 10 detik.
- Cursor/presence sinkron tanpa ghost state.
