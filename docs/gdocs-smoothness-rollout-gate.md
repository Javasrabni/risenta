# GDocs-like Smoothness Rollout Gate

## Canary Scope
- Mulai dari 5% traffic internal/staging users.
- Naikkan ke 25% setelah 2 jam stabil.
- Naikkan ke 100% setelah 24-48 jam tanpa regresi kritis.

## Acceptance Metrics
- `typing_local_p95_ms` <= 16 ms (target UI budget).
- `remote_propagation_p95_ms` <= 200 ms.
- `ws_disconnect_total` tidak naik signifikan per jam.
- `ws_doc_join_error_total` mendekati nol.
- Tidak ada report data loss setelah reconnect <= 10 detik.

## Smoke Checklist (Wajib Lulus)
- Two-user concurrent editing stabil selama 10 menit.
- Cursor presence sinkron dua arah.
- Reconnect test (network drop 5-10 detik) melakukan recovery tanpa kehilangan perubahan.
- AI inline action dan comments flow tetap berjalan.

## Rollback Trigger
- Sync error kritis > 1% sesi aktif.
- Banyak kasus dokumen divergen antar user.
- Crash runtime di editor/collab path.

## Rollback Action
- Set `NEXT_PUBLIC_NEW_EDITOR_COLLAB_ENGINE=false`.
- Redeploy.
- Kumpulkan log + metric snapshot untuk postmortem.
