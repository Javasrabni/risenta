import { NextResponse } from 'next/server';
import { getWriteMetricsSnapshot } from '@/lib/metrics/writeMetrics';

export async function GET() {
  return NextResponse.json({
    success: true,
    metrics: getWriteMetricsSnapshot(),
    generatedAt: new Date().toISOString(),
  });
}
