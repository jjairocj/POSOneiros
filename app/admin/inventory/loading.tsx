export default function InventoryLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center mb-10">
                <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-muted rounded-2xl" />
                    <div className="space-y-2">
                        <div className="h-9 w-72 bg-muted rounded-2xl" />
                        <div className="h-4 w-96 bg-muted/60 rounded-xl" />
                    </div>
                </div>
                <div className="h-10 w-44 bg-muted rounded-xl" />
            </div>

            {/* Tab bar */}
            <div className="h-12 w-64 bg-muted/50 rounded-2xl" />

            {/* Toolbar */}
            <div className="flex justify-end">
                <div className="h-10 w-36 bg-muted rounded-xl" />
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-12 bg-muted/40 border-b border-border" />
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 border-b border-border/50 flex items-center px-4 gap-4">
                        <div className="h-4 w-24 bg-muted rounded-lg" />
                        <div className="h-4 flex-1 bg-muted/60 rounded-lg" />
                        <div className="h-4 w-20 bg-muted rounded-lg" />
                        <div className="h-4 w-12 bg-muted/60 rounded-lg" />
                        <div className="h-8 w-16 bg-muted rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
