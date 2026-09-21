"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getMyTutorialMode, setMyTutorialMode } from "@/app/actions/users";
import { DialogDescription } from "@/components/ui/dialog";

const CACHE_KEY = "oneiros-tutorial-mode";

interface TutorialModeValue {
    enabled: boolean;
    setEnabled: (v: boolean) => Promise<void>;
}

const TutorialModeContext = createContext<TutorialModeValue>({ enabled: false, setEnabled: async () => {} });

/**
 * "Modo Tutorial" (per-user, saved on the account): while off, every
 * explanatory helper text in the app is hidden. localStorage is only a
 * first-paint cache so a tutorial-mode user doesn't see the text pop in after
 * the server round-trip; the account setting is the source of truth.
 */
export function TutorialModeProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [enabled, setEnabledState] = useState(false);

    useEffect(() => {
        try { setEnabledState(localStorage.getItem(CACHE_KEY) === "true"); } catch { /* private mode */ }
    }, []);

    useEffect(() => {
        if (status !== "authenticated") return;
        getMyTutorialMode().then((v) => {
            setEnabledState(v);
            try { localStorage.setItem(CACHE_KEY, String(v)); } catch { /* ignore */ }
        });
    }, [status]);

    const setEnabled = useCallback(async (v: boolean) => {
        setEnabledState(v);
        try { localStorage.setItem(CACHE_KEY, String(v)); } catch { /* ignore */ }
        await setMyTutorialMode(v);
    }, []);

    return <TutorialModeContext.Provider value={{ enabled, setEnabled }}>{children}</TutorialModeContext.Provider>;
}

export const useTutorialMode = () => useContext(TutorialModeContext);

/** Helper/explanatory text: rendered only while Modo Tutorial is on. */
export function Hint({ children, className, as: Tag = "p" }: { children: React.ReactNode; className?: string; as?: "p" | "span" | "div" }) {
    const { enabled } = useTutorialMode();
    if (!enabled) return null;
    return <Tag className={className}>{children}</Tag>;
}

/** Dialog subtitle: visible in Modo Tutorial, otherwise kept as screen-reader-only text so the dialog stays accessible. */
export function HintDialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    const { enabled } = useTutorialMode();
    return <DialogDescription className={enabled ? className : "sr-only"}>{children}</DialogDescription>;
}
