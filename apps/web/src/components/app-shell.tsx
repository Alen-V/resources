'use client';

import { Separator } from '@/components/ui/separator';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    BoxIcon,
    ExternalLinkIcon,
    LayersIcon,
    MoonIcon,
    PackageIcon,
    PanelLeftIcon,
    PanelTopIcon,
    RocketIcon,
    ShapesIcon,
    SparklesIcon,
    SunIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import * as React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const overviewNav: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayersIcon },
    { label: 'Components', href: '/preview', icon: SparklesIcon },
    { label: 'SF Symbols', href: '/ios-symbols', icon: ShapesIcon },
];

const workspaceNav: NavItem[] = [
    { label: 'apps/web', href: '#', icon: BoxIcon },
    { label: 'packages/shared', href: '#', icon: PackageIcon },
    { label: 'packages/design-tokens', href: '#', icon: PackageIcon },
];

type LayoutMode = 'sidebar' | 'header';
const LAYOUT_STORAGE_KEY = 'resources:layout';

function useLayoutMode() {
    const [mode, setMode] = React.useState<LayoutMode>('header');
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        try {
            const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
            if (stored === 'header' || stored === 'sidebar') setMode(stored);
        } catch {}
        setMounted(true);
    }, []);

    const update = React.useCallback((next: LayoutMode) => {
        setMode(next);
        try {
            window.localStorage.setItem(LAYOUT_STORAGE_KEY, next);
        } catch {}
    }, []);

    return { mode, setMode: update, mounted };
}

function isActive(pathname: string, href: string) {
    if (href === '/') return pathname === '/';
    if (href === '#') return false;
    return pathname === href || pathname.startsWith(`${href}/`);
}

function LayoutToggle({ mode, onChange, disabled }: { mode: LayoutMode; onChange: (next: LayoutMode) => void; disabled?: boolean }) {
    const isHeader = mode === 'header';
    const label = isHeader ? 'Switch to sidebar layout' : 'Switch to header layout';
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Toggle
                    variant="outline"
                    size="sm"
                    pressed={isHeader}
                    onPressedChange={(v) => onChange(v ? 'header' : 'sidebar')}
                    disabled={disabled}
                    aria-label={label}
                >
                    {isHeader ? <PanelTopIcon /> : <PanelLeftIcon />}
                </Toggle>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Toggle
                    variant="outline"
                    size="sm"
                    pressed={isDark}
                    onPressedChange={(v) => setTheme(v ? 'dark' : 'light')}
                    disabled={!mounted}
                    aria-label={label}
                >
                    {isDark ? <MoonIcon /> : <SunIcon />}
                </Toggle>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
    return (
        <div className="flex items-center gap-2">
            <div
                className={cn(
                    'bg-primary text-primary-foreground flex items-center justify-center rounded-lg',
                    size === 'sm' ? 'size-7' : 'size-8',
                )}
            >
                <RocketIcon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
            </div>
            <span className="text-sm font-semibold">Resources</span>
        </div>
    );
}

function AppSidebar({ pathname }: { pathname: string }) {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="px-2 py-1.5 group-data-[collapsible=icon]:px-0">
                    <div className="group-data-[collapsible=icon]:hidden">
                        <BrandMark />
                    </div>
                    <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
                        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                            <RocketIcon className="size-4" />
                        </div>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Overview</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {overviewNav.map((item) => (
                                <SidebarMenuItem key={item.label}>
                                    <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.label}>
                                        <Link href={item.href}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {workspaceNav.map((item) => (
                                <SidebarMenuItem key={item.label}>
                                    <SidebarMenuButton tooltip={item.label}>
                                        <item.icon />
                                        <span className="font-mono text-xs">{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="GitHub">
                            <a href="https://github.com/Alen-V/resources" target="_blank" rel="noreferrer">
                                <ExternalLinkIcon />
                                <span>GitHub</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

function HeaderNav({ pathname }: { pathname: string }) {
    return (
        <nav className="hidden items-center gap-1 md:flex">
            {overviewNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                            active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <item.icon className="size-4" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const { mode, setMode, mounted } = useLayoutMode();
    const pathname = usePathname();

    if (mode === 'header') {
        return (
            <div className="flex h-full flex-col overflow-hidden">
                <header className="bg-background/80 sticky top-0 z-20 flex h-16 items-center gap-6 border-b px-4 backdrop-blur sm:px-6">
                    <Link href="/" className="flex items-center">
                        <BrandMark size="sm" />
                    </Link>
                    <Separator orientation="vertical" className="h-6" />
                    <HeaderNav pathname={pathname} />
                    <div className="ml-auto flex items-center gap-1.5">
                        <LayoutToggle mode={mode} onChange={setMode} disabled={!mounted} />
                        <ThemeToggle />
                    </div>
                </header>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
            </div>
        );
    }

    return (
        <SidebarProvider className="h-full">
            <AppSidebar pathname={pathname} />
            <SidebarInset>
                <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="h-5" />
                    <div className="text-muted-foreground text-sm">{pathname}</div>
                    <div className="ml-auto flex items-center gap-1.5">
                        <LayoutToggle mode={mode} onChange={setMode} disabled={!mounted} />
                        <ThemeToggle />
                    </div>
                </header>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
