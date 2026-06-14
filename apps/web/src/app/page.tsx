import {
  ExternalLinkIcon,
  LayersIcon,
  PackageIcon,
  RocketIcon,
  SettingsIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import { greeting } from "@monorepo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/20">
      <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-10 px-4 py-10 sm:px-8 lg:px-12">
      <section className="flex flex-col gap-5">
        <Badge variant="secondary" className="w-fit gap-1.5 rounded-full px-3 py-1">
          <SparklesIcon className="size-3" />
          Starter template
        </Badge>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {greeting("Monorepo Template")}
        </h1>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          A modern starting point for product teams: pnpm workspaces, Next.js 16, shadcn/ui on Radix, and shared design tokens — all wired up and ready to ship.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href="/preview">
              <SparklesIcon />
              Browse components
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="https://github.com/Alen-V/monorepo-template" target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              View on GitHub
            </a>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">What&apos;s included</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={LayersIcon}
            title="Workspace-ready"
            description="pnpm workspaces with shared packages for tokens, utilities, and types."
          />
          <FeatureCard
            icon={SparklesIcon}
            title="shadcn/ui (radix-maia)"
            description="50+ accessible components built on Radix primitives with Lucide icons."
          />
          <FeatureCard
            icon={PackageIcon}
            title="Design tokens"
            description="Centralized theme tokens consumed by Tailwind v4 and any package in the monorepo."
          />
          <FeatureCard
            icon={TerminalIcon}
            title="Next.js 16 + Turbopack"
            description="App Router, RSC by default, and a fast dev loop with Turbopack."
          />
          <FeatureCard
            icon={RocketIcon}
            title="Beads issue tracking"
            description="AI-native issue tracking lives next to your code via the bd CLI."
          />
          <FeatureCard
            icon={SettingsIcon}
            title="Sensible defaults"
            description="Themes, fonts, ESLint, and TypeScript pre-configured — tweak only what you need."
          />
        </div>
      </section>
    </main>
  );
}
