import React from "react";
import {
  DappProvider,
  NotificationModal,
  TransactionsToastList,
} from "@multiversx/sdk-dapp/ui";
import { dappConfig } from "./mvx-dapp-config";

export default function MultiversxProvider({ children }) {
  return (
    <DappProvider
      environment={dappConfig.environment}
      customNetworkConfig={{
        name: dappConfig.environment,
        apiTimeout: dappConfig.apiTimeout,
        walletConnectBridge: dappConfig.walletConnectBridge,
        walletConnectDeepLink: dappConfig.walletConnectDeepLink,
        apiUrl: dappConfig.apiUrl,
        explorerUrl: dappConfig.explorerUrl,
      }}
    >
      {children}
      <NotificationModal />
      <TransactionsToastList />
    </DappProvider>
  );
}
