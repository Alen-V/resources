import 'server-only';

import { Resend } from 'resend';

export function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    return new Resend(apiKey);
}

export function isResendConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
}
