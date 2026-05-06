export default function SalesLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex gap-4 items-center mb-10">
                <div className="w-14 h-14 bg-muted rounded-2xl" />
                <div className="space-y-2">
                    <div className="h-9 w-64 bg-muted rounded-2xl" />
                    <div className="h-4 w-80 bg-muted/60 rounded-xl" />
                </div>
            </div>

            {/* Tab bar */}
            <div className="h-12 w-64 bg-muted/50 rounded-2xl" />

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-2">
                        <div className="h-3 w-24 bg-muted rounded-lg" />
                        <div className="h-7 w-28 bg-muted rounded-xl" />
                    </div>
                ))}
            </div>

            {/* Chart placeholder */}
            <div className="bg-card rounded-3xl border border-border p-6">
                <div className="h-4 w-36 bg-muted rounded-xl mb-6" />
                <div className="h-[240px] bg-muted/40 rounded-2xl" />
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-12 bg-muted/40 border-b border-border" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 border-b border-border/50 flex items-center px-4 gap-4">
                        <div className="h-4 w-20 bg-muted rounded-lg" />
                        <div className="h-4 w-32 bg-muted/60 rounded-lg" />
                        <div className="h-4 flex-1 bg-muted/40 rounded-lg" />
                        <div className="h-4 w-24 bg-muted rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}
