import { getResendClient } from '@/lib/email/resend';

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

type SendEmailBody = {
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    from?: string;
};

export async function POST(req: NextRequest) {
    const resend = getResendClient();
    if (!resend) {
        return NextResponse.json({ error: 'Resend is not configured. Set RESEND_API_KEY to enable this route.' }, { status: 503 });
    }

    let body: SendEmailBody;
    try {
        body = (await req.json()) as SendEmailBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { to, subject, text, html } = body;
    const from = body.from ?? process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    if (!to || !subject || (!text && !html)) {
        return NextResponse.json({ error: "Missing required fields: 'to', 'subject', and one of 'text' or 'html'." }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        ...(html ? { html } : { text: text as string }),
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ id: data?.id });
}
