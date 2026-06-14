'use client';

import SiriOrb from '@/components/smoothui/siri-orb';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/components/ui/button-group';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from '@/components/ui/item';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarShortcut,
    MenubarTrigger,
} from '@/components/ui/menubar';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import * as React from 'react';

type Section = { id: string; label: string; render: () => React.ReactNode };

function Variant({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</span>
            <div className={cn('bg-card flex flex-wrap items-start gap-3 rounded-2xl border p-4', className)}>{children}</div>
        </div>
    );
}

function SectionWrap({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <section id={id} className="flex scroll-mt-6 flex-col gap-4">
            <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold tracking-tight">{label}</h2>
                <code className="text-muted-foreground text-xs">{id}</code>
            </div>
            <div className="flex flex-col gap-4">{children}</div>
        </section>
    );
}

const sections: Section[] = [
    {
        id: 'accordion',
        label: 'Accordion',
        render: () => (
            <Variant label="Default">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="a">
                        <AccordionTrigger>First item</AccordionTrigger>
                        <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="b">
                        <AccordionTrigger>Second item</AccordionTrigger>
                        <AccordionContent>Yes. It is animated by default.</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="c">
                        <AccordionTrigger>Third item</AccordionTrigger>
                        <AccordionContent>Yes. It’s fully styleable.</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Variant>
        ),
    },
    {
        id: 'alert',
        label: 'Alert',
        render: () => (
            <>
                <Variant label="Default">
                    <Alert className="max-w-md">
                        <AlertTitle>Heads up</AlertTitle>
                        <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
                    </Alert>
                </Variant>
                <Variant label="Destructive">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
                    </Alert>
                </Variant>
            </>
        ),
    },
    {
        id: 'alert-dialog',
        label: 'Alert Dialog',
        render: () => (
            <Variant label="Confirmation">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline">Delete account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. It will permanently remove your data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Variant>
        ),
    },
    {
        id: 'aspect-ratio',
        label: 'Aspect Ratio',
        render: () => (
            <Variant label="16 / 9">
                <div className="w-full max-w-md">
                    <AspectRatio ratio={16 / 9}>
                        <div className="bg-muted text-muted-foreground flex size-full items-center justify-center rounded-2xl text-sm">
                            16 : 9
                        </div>
                    </AspectRatio>
                </div>
            </Variant>
        ),
    },
    {
        id: 'avatar',
        label: 'Avatar',
        render: () => (
            <>
                <Variant label="Image + fallback">
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Avatar>
                        <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                </Variant>
                <Variant label="Sizes">
                    <Avatar size="sm">
                        <AvatarFallback>SM</AvatarFallback>
                    </Avatar>
                    <Avatar>
                        <AvatarFallback>MD</AvatarFallback>
                    </Avatar>
                    <Avatar size="lg">
                        <AvatarFallback>LG</AvatarFallback>
                    </Avatar>
                </Variant>
                <Variant label="Group">
                    <AvatarGroup>
                        <Avatar>
                            <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <Avatar>
                            <AvatarFallback>B</AvatarFallback>
                        </Avatar>
                        <Avatar>
                            <AvatarFallback>C</AvatarFallback>
                        </Avatar>
                        <AvatarGroupCount>+4</AvatarGroupCount>
                    </AvatarGroup>
                </Variant>
            </>
        ),
    },
    {
        id: 'badge',
        label: 'Badge',
        render: () => (
            <Variant label="Variants">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="ghost">Ghost</Badge>
                <Badge variant="link">Link</Badge>
            </Variant>
        ),
    },
    {
        id: 'breadcrumb',
        label: 'Breadcrumb',
        render: () => (
            <Variant label="Default">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbEllipsis />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#">Components</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </Variant>
        ),
    },
    {
        id: 'button',
        label: 'Button',
        render: () => (
            <>
                <Variant label="Variants">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="link">Link</Button>
                </Variant>
                <Variant label="Sizes">
                    <Button size="xs">xs</Button>
                    <Button size="sm">sm</Button>
                    <Button>default</Button>
                    <Button size="lg">lg</Button>
                </Variant>
                <Variant label="Disabled">
                    <Button disabled>Default</Button>
                    <Button variant="outline" disabled>
                        Outline
                    </Button>
                </Variant>
            </>
        ),
    },
    {
        id: 'button-group',
        label: 'Button Group',
        render: () => (
            <>
                <Variant label="Attached">
                    <ButtonGroup>
                        <Button variant="outline">Bold</Button>
                        <Button variant="outline">Italic</Button>
                        <Button variant="outline">Underline</Button>
                    </ButtonGroup>
                </Variant>
                <Variant label="With text and separator">
                    <ButtonGroup>
                        <Button variant="outline">Previous</Button>
                        <ButtonGroupSeparator />
                        <ButtonGroupText>Page 3 of 10</ButtonGroupText>
                        <ButtonGroupSeparator />
                        <Button variant="outline">Next</Button>
                    </ButtonGroup>
                </Variant>
            </>
        ),
    },
    {
        id: 'calendar',
        label: 'Calendar',
        render: () => {
            return <CalendarPreview />;
        },
    },
    {
        id: 'card',
        label: 'Card',
        render: () => (
            <Variant label="Default">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>Enter your credentials to sign in.</CardDescription>
                        <CardAction>
                            <Button variant="link">Sign up</Button>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Email</FieldLabel>
                                <Input type="email" placeholder="you@example.com" />
                            </Field>
                            <Field>
                                <FieldLabel>Password</FieldLabel>
                                <Input type="password" />
                            </Field>
                        </FieldGroup>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full">Sign in</Button>
                        <Button variant="outline" className="w-full">
                            Continue with GitHub
                        </Button>
                    </CardFooter>
                </Card>
            </Variant>
        ),
    },
    {
        id: 'carousel',
        label: 'Carousel',
        render: () => (
            <Variant label="Default">
                <Carousel className="w-full max-w-xs">
                    <CarouselContent>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <CarouselItem key={i}>
                                <Card>
                                    <CardContent className="flex aspect-square items-center justify-center p-6">
                                        <span className="text-4xl font-semibold">{i + 1}</span>
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </Variant>
        ),
    },
    {
        id: 'checkbox',
        label: 'Checkbox',
        render: () => (
            <Variant label="States">
                <Field orientation="horizontal">
                    <Checkbox id="cb-default" />
                    <FieldLabel htmlFor="cb-default">Default</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                    <Checkbox id="cb-checked" defaultChecked />
                    <FieldLabel htmlFor="cb-checked">Checked</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                    <Checkbox id="cb-disabled" disabled />
                    <FieldLabel htmlFor="cb-disabled">Disabled</FieldLabel>
                </Field>
            </Variant>
        ),
    },
    {
        id: 'collapsible',
        label: 'Collapsible',
        render: () => (
            <Variant label="Default">
                <Collapsible className="w-full max-w-md">
                    <div className="flex items-center justify-between rounded-xl border p-3">
                        <span className="text-sm font-medium">@peduarte starred 3 repos</span>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                                Toggle
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="flex flex-col gap-2 pt-2">
                        <div className="rounded-xl border p-3 text-sm">@radix-ui/primitives</div>
                        <div className="rounded-xl border p-3 text-sm">@radix-ui/colors</div>
                        <div className="rounded-xl border p-3 text-sm">@stitches/react</div>
                    </CollapsibleContent>
                </Collapsible>
            </Variant>
        ),
    },
    {
        id: 'command',
        label: 'Command',
        render: () => (
            <Variant label="Inline">
                <Command className="w-full max-w-md rounded-2xl border shadow-xs">
                    <CommandInput placeholder="Type a command or search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Suggestions">
                            <CommandItem>Calendar</CommandItem>
                            <CommandItem>Search Emoji</CommandItem>
                            <CommandItem>Calculator</CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Settings">
                            <CommandItem>
                                Profile
                                <CommandShortcut>⌘P</CommandShortcut>
                            </CommandItem>
                            <CommandItem>
                                Billing
                                <CommandShortcut>⌘B</CommandShortcut>
                            </CommandItem>
                            <CommandItem>
                                Settings
                                <CommandShortcut>⌘S</CommandShortcut>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </Variant>
        ),
    },
    {
        id: 'context-menu',
        label: 'Context Menu',
        render: () => (
            <Variant label="Right-click area">
                <ContextMenu>
                    <ContextMenuTrigger className="text-muted-foreground flex h-24 w-full max-w-sm items-center justify-center rounded-2xl border border-dashed text-sm">
                        Right-click here
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuLabel>Actions</ContextMenuLabel>
                        <ContextMenuItem>
                            Back
                            <ContextMenuShortcut>⌘[</ContextMenuShortcut>
                        </ContextMenuItem>
                        <ContextMenuItem>
                            Forward
                            <ContextMenuShortcut>⌘]</ContextMenuShortcut>
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuCheckboxItem defaultChecked>Show bookmarks</ContextMenuCheckboxItem>
                    </ContextMenuContent>
                </ContextMenu>
            </Variant>
        ),
    },
    {
        id: 'dialog',
        label: 'Dialog',
        render: () => (
            <Variant label="Default">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">Open dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit profile</DialogTitle>
                            <DialogDescription>Make changes to your profile. Click save when you’re done.</DialogDescription>
                        </DialogHeader>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Name</FieldLabel>
                                <Input defaultValue="Pedro Duarte" />
                            </Field>
                            <Field>
                                <FieldLabel>Username</FieldLabel>
                                <Input defaultValue="@peduarte" />
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button>Save changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Variant>
        ),
    },
    {
        id: 'drawer',
        label: 'Drawer',
        render: () => (
            <Variant label="Bottom">
                <Drawer>
                    <DrawerTrigger>Open drawer</DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Move goal</DrawerTitle>
                            <DrawerDescription>Set a daily activity target.</DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4">
                            <Slider defaultValue={[40]} max={100} step={1} />
                        </div>
                        <DrawerFooter>
                            <Button>Submit</Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </Variant>
        ),
    },
    {
        id: 'dropdown-menu',
        label: 'Dropdown Menu',
        render: () => (
            <Variant label="Default">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">Menu</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            Profile
                            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Billing
                            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem defaultChecked>Show activity</DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup defaultValue="pedro">
                            <DropdownMenuRadioItem value="pedro">Pedro</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="colm">Colm</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </Variant>
        ),
    },
    {
        id: 'empty',
        label: 'Empty',
        render: () => (
            <Variant label="Default">
                <Empty className="w-full max-w-md">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">📬</EmptyMedia>
                        <EmptyTitle>No messages yet</EmptyTitle>
                        <EmptyDescription>When you get a new message it will appear here.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button size="sm">Invite people</Button>
                    </EmptyContent>
                </Empty>
            </Variant>
        ),
    },
    {
        id: 'field',
        label: 'Field',
        render: () => (
            <Variant label="FieldSet">
                <FieldSet className="w-full max-w-md">
                    <FieldLegend>Shipping address</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>Street</FieldLabel>
                            <Input placeholder="123 Main St" />
                            <FieldDescription>Your primary residence.</FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel>City</FieldLabel>
                            <Input placeholder="San Francisco" />
                        </Field>
                        <Field>
                            <FieldLabel>ZIP</FieldLabel>
                            <Input aria-invalid />
                            <FieldError>ZIP is required.</FieldError>
                        </Field>
                    </FieldGroup>
                </FieldSet>
            </Variant>
        ),
    },
    {
        id: 'hover-card',
        label: 'Hover Card',
        render: () => (
            <Variant label="Default">
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <Button variant="link">@nextjs</Button>
                    </HoverCardTrigger>
                    <HoverCardContent>
                        <div className="flex gap-3">
                            <Avatar>
                                <AvatarFallback>NJ</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold">@nextjs</span>
                                <span className="text-muted-foreground text-xs">The React Framework — joined December 2021</span>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            </Variant>
        ),
    },
    {
        id: 'input',
        label: 'Input',
        render: () => (
            <>
                <Variant label="States">
                    <Input placeholder="Default" className="max-w-xs" />
                    <Input defaultValue="Filled" className="max-w-xs" />
                    <Input disabled placeholder="Disabled" className="max-w-xs" />
                    <Input aria-invalid placeholder="Invalid" className="max-w-xs" />
                </Variant>
                <Variant label="Types">
                    <Input type="email" placeholder="Email" className="max-w-xs" />
                    <Input type="password" placeholder="Password" className="max-w-xs" />
                    <Input type="number" placeholder="Number" className="max-w-xs" />
                    <Input type="file" className="max-w-xs" />
                </Variant>
            </>
        ),
    },
    {
        id: 'input-group',
        label: 'Input Group',
        render: () => (
            <>
                <Variant label="With prefix">
                    <InputGroup className="w-full max-w-sm">
                        <InputGroupAddon>
                            <InputGroupText>https://</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput placeholder="example.com" />
                    </InputGroup>
                </Variant>
                <Variant label="With button suffix">
                    <InputGroup className="w-full max-w-sm">
                        <InputGroupInput placeholder="Enter code" />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton size="sm">Apply</InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </Variant>
            </>
        ),
    },
    {
        id: 'input-otp',
        label: 'Input OTP',
        render: () => (
            <Variant label="6 digits">
                <InputOTP maxLength={6}>
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                    </InputOTPGroup>
                </InputOTP>
            </Variant>
        ),
    },
    {
        id: 'item',
        label: 'Item',
        render: () => (
            <Variant label="Group">
                <ItemGroup className="w-full max-w-md">
                    <Item variant="outline">
                        <ItemMedia variant="icon">⭐</ItemMedia>
                        <ItemContent>
                            <ItemTitle>Starred</ItemTitle>
                            <ItemDescription>Items you’ve marked as favorite.</ItemDescription>
                        </ItemContent>
                        <ItemActions>
                            <Button variant="ghost" size="sm">
                                Open
                            </Button>
                        </ItemActions>
                    </Item>
                    <ItemSeparator />
                    <Item variant="outline">
                        <ItemMedia variant="icon">📁</ItemMedia>
                        <ItemContent>
                            <ItemTitle>Projects</ItemTitle>
                            <ItemDescription>All active projects.</ItemDescription>
                        </ItemContent>
                    </Item>
                </ItemGroup>
            </Variant>
        ),
    },
    {
        id: 'kbd',
        label: 'Kbd',
        render: () => (
            <Variant label="Default">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
                <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>⇧</Kbd>
                    <Kbd>P</Kbd>
                </KbdGroup>
            </Variant>
        ),
    },
    {
        id: 'label',
        label: 'Label',
        render: () => (
            <Variant label="Default">
                <Label htmlFor="label-demo">Email</Label>
                <Input id="label-demo" type="email" className="max-w-xs" />
            </Variant>
        ),
    },
    {
        id: 'menubar',
        label: 'Menubar',
        render: () => (
            <Variant label="Default">
                <Menubar>
                    <MenubarMenu>
                        <MenubarTrigger>File</MenubarTrigger>
                        <MenubarContent>
                            <MenubarItem>
                                New tab <MenubarShortcut>⌘T</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem>New window</MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem>Share</MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem>Print</MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                        <MenubarTrigger>Edit</MenubarTrigger>
                        <MenubarContent>
                            <MenubarItem>
                                Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem>
                                Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                        <MenubarTrigger>View</MenubarTrigger>
                        <MenubarContent>
                            <MenubarItem>Toggle fullscreen</MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>
            </Variant>
        ),
    },
    {
        id: 'native-select',
        label: 'Native Select',
        render: () => (
            <Variant label="Default">
                <NativeSelect defaultValue="apple" className="max-w-xs">
                    <NativeSelectOption value="apple">Apple</NativeSelectOption>
                    <NativeSelectOption value="banana">Banana</NativeSelectOption>
                    <NativeSelectOption value="cherry">Cherry</NativeSelectOption>
                </NativeSelect>
            </Variant>
        ),
    },
    {
        id: 'pagination',
        label: 'Pagination',
        render: () => (
            <Variant label="Default">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#" isActive>
                                2
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext href="#" />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </Variant>
        ),
    },
    {
        id: 'popover',
        label: 'Popover',
        render: () => (
            <Variant label="Default">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">Open popover</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium">Dimensions</span>
                            <span className="text-muted-foreground text-xs">Set the dimensions for the layer.</span>
                            <Field>
                                <FieldLabel>Width</FieldLabel>
                                <Input defaultValue="100%" />
                            </Field>
                        </div>
                    </PopoverContent>
                </Popover>
            </Variant>
        ),
    },
    {
        id: 'progress',
        label: 'Progress',
        render: () => (
            <Variant label="Values">
                <Progress value={0} className="w-full max-w-sm" />
                <Progress value={33} className="w-full max-w-sm" />
                <Progress value={66} className="w-full max-w-sm" />
                <Progress value={100} className="w-full max-w-sm" />
            </Variant>
        ),
    },
    {
        id: 'radio-group',
        label: 'Radio Group',
        render: () => (
            <Variant label="Default">
                <RadioGroup defaultValue="a">
                    <Field orientation="horizontal">
                        <RadioGroupItem value="a" id="rg-a" />
                        <FieldLabel htmlFor="rg-a">Option A</FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <RadioGroupItem value="b" id="rg-b" />
                        <FieldLabel htmlFor="rg-b">Option B</FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <RadioGroupItem value="c" id="rg-c" disabled />
                        <FieldLabel htmlFor="rg-c">Option C (disabled)</FieldLabel>
                    </Field>
                </RadioGroup>
            </Variant>
        ),
    },
    {
        id: 'resizable',
        label: 'Resizable',
        render: () => (
            <Variant label="Horizontal">
                <ResizablePanelGroup className="max-w-md rounded-2xl border">
                    <ResizablePanel defaultSize={50}>
                        <div className="flex h-[160px] items-center justify-center p-4 text-sm">One</div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50}>
                        <div className="flex h-[160px] items-center justify-center p-4 text-sm">Two</div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </Variant>
        ),
    },
    {
        id: 'scroll-area',
        label: 'Scroll Area',
        render: () => (
            <Variant label="Vertical">
                <ScrollArea className="h-48 w-full max-w-xs rounded-2xl border p-4">
                    <div className="flex flex-col gap-2 text-sm">
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i}>Item {i + 1}</div>
                        ))}
                    </div>
                </ScrollArea>
            </Variant>
        ),
    },
    {
        id: 'select',
        label: 'Select',
        render: () => (
            <Variant label="Default">
                <Select defaultValue="apple">
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Fruit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Fruits</SelectLabel>
                            <SelectItem value="apple">Apple</SelectItem>
                            <SelectItem value="banana">Banana</SelectItem>
                            <SelectItem value="cherry">Cherry</SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>Vegetables</SelectLabel>
                            <SelectItem value="carrot">Carrot</SelectItem>
                            <SelectItem value="potato">Potato</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Variant>
        ),
    },
    {
        id: 'separator',
        label: 'Separator',
        render: () => (
            <>
                <Variant label="Horizontal">
                    <div className="w-full max-w-sm">
                        <div className="text-sm">Above</div>
                        <Separator className="my-2" />
                        <div className="text-sm">Below</div>
                    </div>
                </Variant>
                <Variant label="Vertical">
                    <div className="flex h-8 items-center gap-3 text-sm">
                        <span>One</span>
                        <Separator orientation="vertical" />
                        <span>Two</span>
                        <Separator orientation="vertical" />
                        <span>Three</span>
                    </div>
                </Variant>
            </>
        ),
    },
    {
        id: 'sheet',
        label: 'Sheet',
        render: () => (
            <Variant label="Sides">
                {(['left', 'right', 'top', 'bottom'] as const).map((side) => (
                    <Sheet key={side}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="capitalize">
                                {side}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side={side}>
                            <SheetHeader>
                                <SheetTitle>{side} sheet</SheetTitle>
                                <SheetDescription>This is a sheet opened from the {side}.</SheetDescription>
                            </SheetHeader>
                            <SheetFooter>
                                <Button>Save</Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                ))}
            </Variant>
        ),
    },
    {
        id: 'skeleton',
        label: 'Skeleton',
        render: () => (
            <Variant label="Default">
                <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-[200px]" />
                        <Skeleton className="h-3 w-[160px]" />
                    </div>
                </div>
            </Variant>
        ),
    },
    {
        id: 'slider',
        label: 'Slider',
        render: () => (
            <>
                <Variant label="Single">
                    <Slider defaultValue={[50]} className="w-full max-w-sm" />
                </Variant>
                <Variant label="Range">
                    <Slider defaultValue={[25, 75]} className="w-full max-w-sm" />
                </Variant>
                <Variant label="Disabled">
                    <Slider defaultValue={[40]} disabled className="w-full max-w-sm" />
                </Variant>
            </>
        ),
    },
    {
        id: 'sonner',
        label: 'Sonner',
        render: () => (
            <Variant label="Triggers">
                <Button variant="outline" onClick={() => toast('Event created.')}>
                    Default
                </Button>
                <Button variant="outline" onClick={() => toast.success('Profile updated.')}>
                    Success
                </Button>
                <Button variant="outline" onClick={() => toast.error('Something went wrong.')}>
                    Error
                </Button>
            </Variant>
        ),
    },
    {
        id: 'spinner',
        label: 'Spinner',
        render: () => (
            <Variant label="Sizes">
                <Spinner className="size-4" />
                <Spinner className="size-6" />
                <Spinner className="size-8" />
            </Variant>
        ),
    },
    {
        id: 'switch',
        label: 'Switch',
        render: () => (
            <Variant label="States">
                <Field orientation="horizontal">
                    <Switch id="sw-off" />
                    <FieldLabel htmlFor="sw-off">Off</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                    <Switch id="sw-on" defaultChecked />
                    <FieldLabel htmlFor="sw-on">On</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                    <Switch id="sw-sm" size="sm" defaultChecked />
                    <FieldLabel htmlFor="sw-sm">Small</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                    <Switch id="sw-dis" disabled />
                    <FieldLabel htmlFor="sw-dis">Disabled</FieldLabel>
                </Field>
            </Variant>
        ),
    },
    {
        id: 'table',
        label: 'Table',
        render: () => (
            <Variant label="Default">
                <Table className="w-full max-w-lg">
                    <TableCaption>A list of recent invoices.</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>INV001</TableCell>
                            <TableCell>
                                <Badge variant="secondary">Paid</Badge>
                            </TableCell>
                            <TableCell className="text-right">$250.00</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>INV002</TableCell>
                            <TableCell>
                                <Badge>Pending</Badge>
                            </TableCell>
                            <TableCell className="text-right">$150.00</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>INV003</TableCell>
                            <TableCell>
                                <Badge variant="destructive">Unpaid</Badge>
                            </TableCell>
                            <TableCell className="text-right">$350.00</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Variant>
        ),
    },
    {
        id: 'tabs',
        label: 'Tabs',
        render: () => (
            <>
                <Variant label="Default">
                    <Tabs defaultValue="account" className="w-full max-w-md">
                        <TabsList>
                            <TabsTrigger value="account">Account</TabsTrigger>
                            <TabsTrigger value="password">Password</TabsTrigger>
                        </TabsList>
                        <TabsContent value="account" className="pt-2 text-sm">
                            Make changes to your account.
                        </TabsContent>
                        <TabsContent value="password" className="pt-2 text-sm">
                            Change your password here.
                        </TabsContent>
                    </Tabs>
                </Variant>
                <Variant label="Line">
                    <Tabs defaultValue="one" className="w-full max-w-md">
                        <TabsList variant="line">
                            <TabsTrigger value="one">One</TabsTrigger>
                            <TabsTrigger value="two">Two</TabsTrigger>
                            <TabsTrigger value="three">Three</TabsTrigger>
                        </TabsList>
                        <TabsContent value="one" className="pt-2 text-sm">
                            Content one.
                        </TabsContent>
                        <TabsContent value="two" className="pt-2 text-sm">
                            Content two.
                        </TabsContent>
                        <TabsContent value="three" className="pt-2 text-sm">
                            Content three.
                        </TabsContent>
                    </Tabs>
                </Variant>
            </>
        ),
    },
    {
        id: 'textarea',
        label: 'Textarea',
        render: () => (
            <Variant label="States">
                <Textarea placeholder="Type your message..." className="max-w-md" />
                <Textarea disabled placeholder="Disabled" className="max-w-md" />
            </Variant>
        ),
    },
    {
        id: 'toggle',
        label: 'Toggle',
        render: () => (
            <>
                <Variant label="Variants">
                    <Toggle>B</Toggle>
                    <Toggle variant="outline">I</Toggle>
                    <Toggle defaultPressed>U</Toggle>
                </Variant>
                <Variant label="Sizes">
                    <Toggle size="sm">sm</Toggle>
                    <Toggle>default</Toggle>
                    <Toggle size="lg">lg</Toggle>
                </Variant>
            </>
        ),
    },
    {
        id: 'toggle-group',
        label: 'Toggle Group',
        render: () => (
            <>
                <Variant label="Single">
                    <ToggleGroup type="single">
                        <ToggleGroupItem value="left">Left</ToggleGroupItem>
                        <ToggleGroupItem value="center">Center</ToggleGroupItem>
                        <ToggleGroupItem value="right">Right</ToggleGroupItem>
                    </ToggleGroup>
                </Variant>
                <Variant label="Outline">
                    <ToggleGroup type="multiple" variant="outline" defaultValue={['bold']}>
                        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
                        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
                        <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
                    </ToggleGroup>
                </Variant>
            </>
        ),
    },
    {
        id: 'tooltip',
        label: 'Tooltip',
        render: () => (
            <Variant label="Default">
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline">Hover me</Button>
                        </TooltipTrigger>
                        <TooltipContent>Nice to meet you</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </Variant>
        ),
    },
    {
        id: 'smoothui-siri-orb',
        label: 'SmoothUI · Siri Orb',
        render: () => (
            <Variant label="Default">
                <SiriOrb size="192px" />
            </Variant>
        ),
    },
];

function CalendarPreview() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return (
        <Variant label="Single date">
            <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-2xl border" />
        </Variant>
    );
}

export default function PreviewPage() {
    const [filter, setFilter] = React.useState('');
    const filtered = sections.filter((s) => s.label.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div className="bg-background text-foreground flex min-h-dvh w-full">
            <aside className="bg-sidebar sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-3 border-r p-4">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">Components</span>
                    <span className="text-muted-foreground text-xs">{sections.length} components</span>
                </div>
                <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
                <ScrollArea className="-mx-1 flex-1">
                    <nav className="flex flex-col gap-px px-1">
                        {filtered.map((s) => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-2 py-1.5 text-sm"
                            >
                                {s.label}
                            </a>
                        ))}
                        {filtered.length === 0 && <span className="text-muted-foreground px-2 py-1.5 text-xs">No matches</span>}
                    </nav>
                </ScrollArea>
            </aside>
            <main className="flex-1 overflow-x-hidden">
                <div className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
                    <header className="flex flex-col gap-1">
                        <h1 className="text-2xl font-semibold tracking-tight">Component preview</h1>
                        <p className="text-muted-foreground text-sm">Live render of all UI components in this workspace.</p>
                    </header>
                    {sections.map((s) => (
                        <SectionWrap key={s.id} id={s.id} label={s.label}>
                            {s.render()}
                        </SectionWrap>
                    ))}
                </div>
            </main>
            <Toaster />
        </div>
    );
}
