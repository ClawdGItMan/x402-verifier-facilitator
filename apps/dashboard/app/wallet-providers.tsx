"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, connectorsForWallets, lightTheme } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Browser wallets",
      wallets: [injectedWallet]
    }
  ],
  {
    appName: "Verifier Facilitator x402",
    projectId: "local-only"
  }
);

const config = createConfig({
  chains: [baseSepolia],
  connectors,
  ssr: false,
  transports: {
    [baseSepolia.id]: http()
  }
});

export function ClientWalletProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={baseSepolia}
          theme={lightTheme({
            accentColor: "#0f766e",
            accentColorForeground: "#ffffff",
            borderRadius: "small",
            fontStack: "system"
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
