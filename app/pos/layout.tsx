import { OfflineSalesSync } from "./components/OfflineSalesSync";
import { ReviewPanel } from "./components/ReviewPanel";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      <OfflineSalesSync />
      <ReviewPanel />
      {children}
    </>
  );
}
