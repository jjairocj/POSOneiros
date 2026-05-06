export default function SettingsLoading() {
    return (
        <div className="space-y-8 animate-pulse max-w-2xl">
            <div className="flex gap-4 items-center mb-10">
                <div className="w-14 h-14 bg-muted rounded-2xl" />
                <div className="space-y-2">
                    <div className="h-9 w-48 bg-muted rounded-2xl" />
                    <div className="h-4 w-72 bg-muted/60 rounded-xl" />
                </div>
            </div>

            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-3xl border border-border p-6 space-y-4">
                    <div className="h-5 w-40 bg-muted rounded-xl" />
                    {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="space-y-1.5">
                            <div className="h-3 w-32 bg-muted/60 rounded-lg" />
                            <div className="h-11 bg-muted/40 rounded-xl" />
                        </div>
                    ))}
                </div>
            ))}

            <div className="flex justify-end">
                <div className="h-12 w-40 bg-muted rounded-2xl" />
            </div>
        </div>
    );
}
