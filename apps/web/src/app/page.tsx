import manifestData from '@/data/ios-symbols/manifest.json';
import { ExternalLinkIcon, ShapesIcon, SparklesIcon } from 'lucide-react';

import Link from 'next/link';

const symbolCount = (manifestData as unknown[]).length;

function ResourceCard({
    href,
    external,
    icon: Icon,
    title,
    description,
}: {
    href: string;
    external?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    const className = 'group bg-card hover:border-foreground/20 relative flex flex-col gap-3 rounded-2xl border p-5 transition-colors';
    const inner = (
        <>
            <div className="bg-muted text-foreground flex size-9 items-center justify-center rounded-xl">
                <Icon className="size-4" />
            </div>
            <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </div>
        </>
    );

    if (external) {
        return (
            <a href={href} target="_blank" rel="noreferrer" className={className}>
                {inner}
            </a>
        );
    }

    return (
        <Link href={href} className={className}>
            {inner}
        </Link>
    );
}

export default function Home() {
    return (
        <main className="flex flex-1 flex-col gap-10 px-4 py-10 sm:px-8 lg:px-12">
            <section className="flex flex-col gap-3">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Resources</h1>
                <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                    A personal workspace of design and development resources — browse the SF Symbols library and the UI component gallery.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">Explore</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ResourceCard
                        href="/ios-symbols"
                        icon={ShapesIcon}
                        title="SF Symbols"
                        description={`Search, filter, and copy any of the ${symbolCount.toLocaleString()} SF Symbols.`}
                    />
                    <ResourceCard
                        href="/preview"
                        icon={SparklesIcon}
                        title="Components"
                        description="Browse the shadcn/ui component gallery built on Radix."
                    />
                    <ResourceCard
                        href="https://github.com/Alen-V/resources"
                        external
                        icon={ExternalLinkIcon}
                        title="GitHub"
                        description="View the source repository on GitHub."
                    />
                </div>
            </section>
        </main>
    );
}
