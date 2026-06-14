'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { ChevronsUpDownIcon } from 'lucide-react';

import { COPY_FORMATS, FACETS, type CategoryDef, type CopyFormat, type Facet, type FilterState, type Languages } from '../_lib/types';

// Radix Select items can't carry an empty value, so the "All languages"
// option uses this sentinel and maps back to `null` at the boundary.
const ALL_LANGUAGES = '__all__';

export interface SymbolToolbarProps {
    categories: CategoryDef[];
    languages: Languages;
    state: FilterState;
    copyFormat: CopyFormat;
    total: number;
    filteredCount: number;
    onQueryChange(q: string): void;
    onToggleCategory(k: string): void;
    onToggleFacet(f: Facet): void;
    onShowLocalizedChange(v: boolean): void;
    onLangChange(c: string | null): void;
    onCopyFormatChange(f: CopyFormat): void;
    onClear(): void;
}

export function SymbolToolbar({
    categories,
    languages,
    state,
    copyFormat,
    total,
    filteredCount,
    onQueryChange,
    onToggleCategory,
    onToggleFacet,
    onShowLocalizedChange,
    onLangChange,
    onCopyFormatChange,
    onClear,
}: SymbolToolbarProps) {
    const selectedCategoryCount = state.categories.size;
    const categoryLabel =
        selectedCategoryCount === 0
            ? 'All categories'
            : `${selectedCategoryCount} ${selectedCategoryCount === 1 ? 'category' : 'categories'}`;

    const languageEntries = Object.entries(languages);

    return (
        <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex flex-col gap-3 border-b px-4 py-3 backdrop-blur">
            {/* Row 1: search, copy format, categories, count, clear */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                    <Label htmlFor="symbol-search" className="sr-only">
                        Search symbols
                    </Label>
                    <Input
                        id="symbol-search"
                        type="search"
                        value={state.query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="Search symbols..."
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Label htmlFor="copy-format" className="text-muted-foreground">
                        Copy as
                    </Label>
                    <Select value={copyFormat} onValueChange={(value) => onCopyFormatChange(value as CopyFormat)}>
                        <SelectTrigger id="copy-format" size="sm" className="min-w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COPY_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                    {format.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" aria-label="Filter by category">
                            {categoryLabel}
                            <ChevronsUpDownIcon className="text-muted-foreground" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 p-0">
                        <Command>
                            <CommandInput placeholder="Filter categories..." />
                            <CommandList>
                                <CommandEmpty>No categories found.</CommandEmpty>
                                <CommandGroup>
                                    {categories.map((category) => {
                                        const checked = state.categories.has(category.key);
                                        return (
                                            <CommandItem
                                                key={category.key}
                                                value={category.label}
                                                data-checked={checked}
                                                aria-checked={checked}
                                                onSelect={() => onToggleCategory(category.key)}
                                            >
                                                {category.label}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <div className="ml-auto flex items-center gap-3">
                    <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
                        <span className="text-foreground font-medium">{filteredCount.toLocaleString()}</span> of {total.toLocaleString()}
                    </p>
                    <Button variant="ghost" size="sm" onClick={onClear}>
                        Clear
                    </Button>
                </div>
            </div>

            {/* Row 2: facet chips, localized toggle + language */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Facets</span>
                    <ToggleGroup
                        type="multiple"
                        variant="outline"
                        size="sm"
                        value={[...state.facets]}
                        aria-label="Filter by facet"
                        className="flex-wrap"
                    >
                        {FACETS.map((facet) => (
                            <ToggleGroupItem key={facet} value={facet} aria-label={facet} onClick={() => onToggleFacet(facet)}>
                                {facet}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                <div className="flex items-center gap-2">
                    <Switch id="show-localized" checked={state.showLocalized} onCheckedChange={onShowLocalizedChange} />
                    <Label htmlFor="show-localized">Show localized</Label>
                </div>

                {state.showLocalized && (
                    <div className="flex items-center gap-2">
                        <Label htmlFor="language" className="text-muted-foreground">
                            Language
                        </Label>
                        <Select
                            value={state.lang ?? ALL_LANGUAGES}
                            onValueChange={(value) => onLangChange(value === ALL_LANGUAGES ? null : value)}
                        >
                            <SelectTrigger id="language" size="sm" className="min-w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_LANGUAGES}>All languages</SelectItem>
                                {languageEntries.map(([code, label]) => (
                                    <SelectItem key={code} value={code}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {selectedCategoryCount > 0 && (
                    <div className={cn('flex flex-wrap items-center gap-1.5')} aria-label="Active categories">
                        {categories
                            .filter((category) => state.categories.has(category.key))
                            .map((category) => (
                                <Badge key={category.key} variant="secondary" asChild className="cursor-pointer">
                                    <button
                                        type="button"
                                        onClick={() => onToggleCategory(category.key)}
                                        aria-label={`Remove ${category.label} filter`}
                                    >
                                        {category.label}
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </Badge>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
