import React from "react";
import { useGetAccount, useGetLoginInfo, useLogin, useLogout } from "@multiversx/sdk-dapp/hooks";
import { WalletConnectLoginButton } from "@multiversx/sdk-dapp/ui";
import { ExtensionLoginButton } from '@multiversx/sdk-dapp/UI/extension/ExtensionLoginButton'

export default function WalletConnectButton() {
  const { isLoggedIn } = useGetLoginInfo();
  const { address } = useGetAccount();
  const { logout } = useLogout();

  return (
    <div>
      {isLoggedIn ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontFamily: "monospace" }}>
            {address.slice(0, 8)}...{address.slice(-6)}
          </span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <WalletConnectLoginButton />
      )}
    </div>
  );
}
