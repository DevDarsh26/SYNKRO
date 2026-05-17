import { NextResponse } from 'next/server';

// Shared scan results store (same reference as scan/route.js)
if (!globalThis.__scanResults) {
  globalThis.__scanResults = new Map();
}
const scanResults = globalThis.__scanResults;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json(
      { error: 'Scan ID is required' },
      { status: 400 }
    );
  }

  const result = scanResults.get(scanId);

  if (!result) {
    return NextResponse.json(
      { error: 'Scan not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
