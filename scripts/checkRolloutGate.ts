type MetricsPayload = {
  success: boolean;
  metrics?: {
    counters?: Record<string, number>;
    timingsP95?: Record<string, number>;
  };
};

async function run(): Promise<void> {
  const baseUrl = process.env.ROLLOUT_BASE_URL || 'http://localhost:3000';
  const maxJoinErrors = Number(process.env.ROLLOUT_MAX_JOIN_ERRORS || 0);
  const maxDisconnects = Number(process.env.ROLLOUT_MAX_DISCONNECTS || 100);
  const maxDocUpdateP95 = Number(process.env.ROLLOUT_MAX_DOC_UPDATE_P95 || 20000);

  const response = await fetch(`${baseUrl}/api/write/metrics`);
  if (!response.ok) {
    throw new Error(`metrics endpoint failed: ${response.status}`);
  }
  const payload = (await response.json()) as MetricsPayload;
  const counters = payload.metrics?.counters || {};
  const timingsP95 = payload.metrics?.timingsP95 || {};

  const joinErrors = counters.ws_doc_join_error_total || 0;
  const disconnects = counters.ws_disconnect_total || 0;
  const docUpdateP95 = timingsP95.ws_doc_update_payload_bytes || 0;

  const failures: string[] = [];
  if (joinErrors > maxJoinErrors) failures.push(`join errors ${joinErrors} > ${maxJoinErrors}`);
  if (disconnects > maxDisconnects) failures.push(`disconnects ${disconnects} > ${maxDisconnects}`);
  if (docUpdateP95 > maxDocUpdateP95) failures.push(`doc update p95 payload ${docUpdateP95} > ${maxDocUpdateP95}`);

  console.log('rollout_gate_snapshot', {
    joinErrors,
    disconnects,
    docUpdateP95,
    thresholds: { maxJoinErrors, maxDisconnects, maxDocUpdateP95 },
  });

  if (failures.length > 0) {
    console.error('rollout_gate_failed', failures);
    process.exit(1);
  }

  console.log('rollout_gate_passed');
}

run().catch((error) => {
  console.error('rollout_gate_error', error);
  process.exit(1);
});
