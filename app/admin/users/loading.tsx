export default function UsersLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center mb-10">
                <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-muted rounded-2xl" />
                    <div className="space-y-2">
                        <div className="h-9 w-64 bg-muted rounded-2xl" />
                        <div className="h-4 w-80 bg-muted/60 rounded-xl" />
                    </div>
                </div>
            </div>

            <div className="h-12 w-48 bg-muted/50 rounded-2xl" />

            <div className="flex justify-end">
                <div className="h-10 w-36 bg-muted rounded-xl" />
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-12 bg-muted/40 border-b border-border" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 border-b border-border/50 flex items-center px-4 gap-6">
                        <div className="w-8 h-8 bg-muted rounded-full" />
                        <div className="h-4 w-40 bg-muted rounded-lg" />
                        <div className="h-4 w-24 bg-muted/60 rounded-lg" />
                        <div className="h-4 flex-1 bg-muted/40 rounded-lg" />
                        <div className="h-7 w-16 bg-muted rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
