export default function AdminDashboardLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="h-10 w-64 bg-muted rounded-2xl" />
            <div className="h-4 w-80 bg-muted/60 rounded-xl" />

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-3xl border border-border p-6 min-h-[150px] flex flex-col justify-between">
                        <div className="flex justify-between">
                            <div className="space-y-2">
                                <div className="h-3 w-28 bg-muted rounded-lg" />
                                <div className="h-8 w-20 bg-muted rounded-xl" />
                            </div>
                            <div className="w-9 h-9 bg-muted rounded-xl" />
                        </div>
                        <div className="h-3 w-36 bg-muted/60 rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-card rounded-3xl border border-border p-6">
                <div className="h-5 w-40 bg-muted rounded-xl mb-6" />
                <div className="h-[280px] bg-muted/40 rounded-2xl" />
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-3xl border border-border p-6 space-y-4">
                        <div className="h-5 w-36 bg-muted rounded-xl" />
                        {Array.from({ length: 5 }).map((_, j) => (
                            <div key={j} className="h-10 bg-muted/40 rounded-xl" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
