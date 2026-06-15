import type { Metadata } from 'next';
import { Figtree, Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

import { AppShell } from '@/components/app-shell';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GoogleAnalytics } from '@/lib/analytics/google-analytics';
import { MicrosoftClarity } from '@/lib/analytics/microsoft-clarity';
import { cn } from '@/lib/utils';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Resources',
    description: 'A personal workspace of design and development resources.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn('h-full font-sans antialiased', geistSans.variable, geistMono.variable, figtree.variable)}
        >
            <body className="bg-background text-foreground flex h-full flex-col overflow-hidden">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <TooltipProvider>
                        <AppShell>{children}</AppShell>
                    </TooltipProvider>
                </ThemeProvider>
                <GoogleAnalytics />
                <MicrosoftClarity />
            </body>
        </html>
    );
}
