import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE ??
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ??
      'http://localhost:4000';

    await fetch(`${apiBase}/api/security/csp-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CSP_REPORT_TOKEN
          ? { 'X-CSP-Report-Token': process.env.CSP_REPORT_TOKEN }
          : {})
      },
      body: JSON.stringify(payload)
    });

    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CSP-REPORT]', JSON.stringify(payload));
    }
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CSP-REPORT] invalid payload');
    }
  }

  return new NextResponse(null, { status: 204 });
}
