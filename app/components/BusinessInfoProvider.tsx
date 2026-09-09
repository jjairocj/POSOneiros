"use client";
import { createContext, useContext } from "react";
import type { SettingsData } from "@/app/actions/settings";

const BusinessInfoContext = createContext<SettingsData | null>(null);

export function BusinessInfoProvider({ value, children }: { value: SettingsData; children: React.ReactNode }) {
    return <BusinessInfoContext.Provider value={value}>{children}</BusinessInfoContext.Provider>;
}

/** Business settings (name, NIT, receipt footer…) loaded once in the root layout. */
export function useBusinessInfo(): SettingsData | null {
    return useContext(BusinessInfoContext);
}
