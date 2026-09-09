"use client";

import dynamic from "next/dynamic";

const ClientWalletProviders = dynamic(
  () => import("./wallet-providers").then((module) => module.ClientWalletProviders),
  {
    ssr: false,
    loading: () => <div className="provider-loading">Starting wallet runtime</div>
  }
);

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClientWalletProviders>{children}</ClientWalletProviders>;
}
