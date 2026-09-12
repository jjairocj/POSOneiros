import { OfflineSalesSync } from "./components/OfflineSalesSync";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineSalesSync />
      {children}
    </>
  );
}
