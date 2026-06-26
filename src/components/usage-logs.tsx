'use client';

import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type UsagePeriod = 'today' | 'month' | 'custom' | 'all';
type GenerationTypeFilter = 'all' | 'title_description' | 'full_product_images' | 'regenerate_image';
type UserEmailFilter = 'all' | string;

type SafeUsageMetadata = {
    view?: unknown;
    isManualColor?: unknown;
};

type UsageLogRow = {
    id: string;
    created_at: string;
    user_email: string | null;
    generation_type: string;
    category: string | null;
    requested_images: number | null;
    successful_images: number | null;
    failed_images: number | null;
    estimated_image_cost_inr: number | string | null;
    estimated_text_cost_inr: number | string | null;
    estimated_total_cost_inr: number | string | null;
    status: string;
    metadata: SafeUsageMetadata | null;
};

const getPeriodStart = (period: UsagePeriod) => {
    const now = new Date();

    if (period === 'today') {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    if (period === 'month') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return null;
};

const getDateInputStart = (value: string) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getDateInputEnd = (value: string) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + 1);
    return date;
};

const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));

const formatInr = (value: number | string | null | undefined) => {
    const numericValue = typeof value === 'string' ? Number(value) : value;

    if (numericValue === null || numericValue === undefined || Number.isNaN(numericValue)) {
        return '₹0';
    }

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(numericValue);
};

const toNumber = (value: number | string | null | undefined) => {
    const numericValue = typeof value === 'string' ? Number(value) : value;
    return numericValue && !Number.isNaN(numericValue) ? numericValue : 0;
};

const getSafeMetadataLabel = (metadata: SafeUsageMetadata | null) => {
    if (!metadata) return '—';

    const parts: string[] = [];

    if (typeof metadata.view === 'string' && metadata.view.trim()) {
        parts.push(`view: ${metadata.view}`);
    }

    if (typeof metadata.isManualColor === 'boolean') {
        parts.push(`manual color: ${metadata.isManualColor ? 'yes' : 'no'}`);
    }

    return parts.length > 0 ? parts.join(' · ') : '—';
};

export function UsageLogs() {
    const [period, setPeriod] = useState<UsagePeriod>('today');
    const [generationType, setGenerationType] = useState<GenerationTypeFilter>('all');
    const [selectedUserEmail, setSelectedUserEmail] = useState<UserEmailFilter>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [userOptions, setUserOptions] = useState<string[]>([]);
    const [logs, setLogs] = useState<UsageLogRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadUserOptions = useCallback(async () => {
        try {
            const supabase = getSupabaseBrowserClient();
            const { data, error } = await supabase
                .from('ai_usage_logs')
                .select('user_email')
                .not('user_email', 'is', null)
                .order('user_email', { ascending: true })
                .limit(1000);

            if (error) {
                throw error;
            }

            const emails = Array.from(
                new Set(
                    (data || [])
                        .map((row) => row.user_email)
                        .filter((email): email is string => Boolean(email?.trim()))
                )
            );

            setUserOptions(emails);
        } catch {
            setUserOptions([]);
        }
    }, []);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setErrorMessage('');

        try {
            const supabase = getSupabaseBrowserClient();
            const periodStart = getPeriodStart(period);
            const customStart = period === 'custom' ? getDateInputStart(customStartDate) : null;
            const customEnd = period === 'custom' ? getDateInputEnd(customEndDate) : null;
            let query = supabase
                .from('ai_usage_logs')
                .select('id, created_at, user_email, generation_type, category, requested_images, successful_images, failed_images, estimated_image_cost_inr, estimated_text_cost_inr, estimated_total_cost_inr, status, metadata')
                .order('created_at', { ascending: false })
                .limit(250);

            if (period === 'custom') {
                if (customStart) {
                    query = query.gte('created_at', customStart.toISOString());
                }

                if (customEnd) {
                    query = query.lt('created_at', customEnd.toISOString());
                }
            } else if (periodStart) {
                query = query.gte('created_at', periodStart.toISOString());
            }

            if (generationType !== 'all') {
                query = query.eq('generation_type', generationType);
            }

            if (selectedUserEmail !== 'all') {
                query = query.eq('user_email', selectedUserEmail);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            setLogs((data || []) as UsageLogRow[]);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to load usage logs.');
        } finally {
            setLoading(false);
        }
    }, [customEndDate, customStartDate, generationType, period, selectedUserEmail]);

    useEffect(() => {
        void loadUserOptions();
    }, [loadUserOptions]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    const todaySummary = useMemo(() => {
        const todayStart = getPeriodStart('today')?.getTime() || 0;
        const monthStart = getPeriodStart('month')?.getTime() || 0;

        return logs.reduce(
            (summary, log) => {
                const createdAt = new Date(log.created_at).getTime();
                const successfulImages = log.successful_images || 0;
                const totalCost = toNumber(log.estimated_total_cost_inr);
                const isFailedOrPartial = log.status === 'failed' || log.status === 'partial_success' || (log.failed_images || 0) > 0;

                if (createdAt >= todayStart) {
                    summary.todayImages += successfulImages;
                    summary.todayCost += totalCost;
                }

                if (createdAt >= monthStart) {
                    summary.monthImages += successfulImages;
                    summary.monthCost += totalCost;
                }

                if (isFailedOrPartial) {
                    summary.failedOrPartial += 1;
                }

                return summary;
            },
            {
                todayImages: 0,
                todayCost: 0,
                monthImages: 0,
                monthCost: 0,
                failedOrPartial: 0,
            }
        );
    }, [logs]);

    return (
        <section className="grid gap-5">
            <div className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-[#171717] text-[#f4d99f] hover:bg-[#171717]">Platform Admin</Badge>
                            <Badge variant="outline" className="border-[#d8c39b] bg-[#fff8ea] text-[#8a6635]">
                                Internal cost only
                            </Badge>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#171717]">Usage Logs</h2>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                            Internal platform-admin view of AI usage and estimated internal costs. Do not reuse these cost fields for customer organization owner dashboards; future customer views should show credits and plan usage only.
                        </p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void loadLogs()} disabled={loading} className="h-10 bg-white">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard label="Today generated images" value={todaySummary.todayImages.toString()} />
                <SummaryCard label="Today estimated internal cost" value={formatInr(todaySummary.todayCost)} />
                <SummaryCard label="This month generated images" value={todaySummary.monthImages.toString()} />
                <SummaryCard label="This month estimated internal cost" value={formatInr(todaySummary.monthCost)} />
                <SummaryCard label="Failed / partial logs" value={todaySummary.failedOrPartial.toString()} />
            </div>

            <Card className="min-w-0 border-black/10 bg-white shadow-sm">
                <CardHeader className="border-b border-black/10">
                    <CardTitle className="text-lg text-[#171717]">Latest logs</CardTitle>
                    <div className="grid gap-3 pt-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="grid gap-2">
                            <Label>Period</Label>
                            <Select value={period} onValueChange={(value) => setPeriod(value as UsagePeriod)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="month">This month</SelectItem>
                                    <SelectItem value="custom">Custom dates</SelectItem>
                                    <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Generation type</Label>
                            <Select value={generationType} onValueChange={(value) => setGenerationType(value as GenerationTypeFilter)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="title_description">title_description</SelectItem>
                                    <SelectItem value="full_product_images">full_product_images</SelectItem>
                                    <SelectItem value="regenerate_image">regenerate_image</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>User</Label>
                            <Select value={selectedUserEmail} onValueChange={(value) => setSelectedUserEmail(value as UserEmailFilter)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {userOptions.map((email) => (
                                        <SelectItem key={email} value={email}>{email}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {period === 'custom' && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="usage-start-date">Start date</Label>
                                    <Input
                                        id="usage-start-date"
                                        type="date"
                                        value={customStartDate}
                                        onChange={(event) => setCustomStartDate(event.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="usage-end-date">End date</Label>
                                    <Input
                                        id="usage-end-date"
                                        type="date"
                                        value={customEndDate}
                                        onChange={(event) => setCustomEndDate(event.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="min-w-0 p-0">
                    {errorMessage ? (
                        <div className="flex items-center gap-2 p-5 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {errorMessage}
                        </div>
                    ) : (
                        <>
                        <p className="px-5 py-3 text-sm text-muted-foreground">Scroll sideways to view all columns.</p>
                        <div className="w-full overflow-x-auto overflow-y-hidden border-t border-black/10 pb-3 [scrollbar-color:#8a6635_#f4efe6] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8a6635] [&::-webkit-scrollbar-track]:bg-[#f4efe6] [&::-webkit-scrollbar]:h-3">
                            <div className="min-w-[1360px]">
                            <table className="w-full caption-bottom text-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-44">created_at</TableHead>
                                        <TableHead className="min-w-48">user_email</TableHead>
                                        <TableHead className="min-w-44">generation_type</TableHead>
                                        <TableHead className="min-w-24">category</TableHead>
                                        <TableHead className="min-w-24 text-right">requested</TableHead>
                                        <TableHead className="min-w-24 text-right">successful</TableHead>
                                        <TableHead className="min-w-20 text-right">failed</TableHead>
                                        <TableHead className="min-w-24 text-right">image cost</TableHead>
                                        <TableHead className="min-w-24 text-right">text cost</TableHead>
                                        <TableHead className="min-w-24 text-right">total cost</TableHead>
                                        <TableHead className="min-w-28">status</TableHead>
                                        <TableHead className="min-w-52">safe metadata</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                                                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                                Loading usage logs…
                                            </TableCell>
                                        </TableRow>
                                    ) : logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                                                No usage logs found for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                                                <TableCell className="whitespace-nowrap">{log.user_email || '—'}</TableCell>
                                                <TableCell className="whitespace-nowrap font-medium">{log.generation_type}</TableCell>
                                                <TableCell>{log.category || '—'}</TableCell>
                                                <TableCell className="text-right">{log.requested_images || 0}</TableCell>
                                                <TableCell className="text-right">{log.successful_images || 0}</TableCell>
                                                <TableCell className="text-right">{log.failed_images || 0}</TableCell>
                                                <TableCell className="text-right">{formatInr(log.estimated_image_cost_inr)}</TableCell>
                                                <TableCell className="text-right">{formatInr(log.estimated_text_cost_inr)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatInr(log.estimated_total_cost_inr)}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <Badge variant={log.status === 'success' ? 'outline' : 'destructive'}>{log.status}</Badge>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-muted-foreground">{getSafeMetadataLabel(log.metadata)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </table>
                            </div>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <Card className="border-black/10 bg-white shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-semibold text-[#171717]">{value}</p>
            </CardContent>
        </Card>
    );
}
