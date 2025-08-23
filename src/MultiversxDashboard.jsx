import React, { useState } from "react";
import {
  useGetAccount,
  useGetLoginInfo,
  useGetNetworkConfig,
  useSignTransactions,
  useGetPendingTransactions,
  useGetCompletedTransactions,
  useGetActiveTransactionsStatus,
  useLogout,
  refreshAccount
} from "@multiversx/sdk-dapp";
import { Address, Transaction, GasLimit } from "@multiversx/sdk-core";

export default function MultiversxDashboard() {
  const { isLoggedIn } = useGetLoginInfo();
  const { address, balance } = useGetAccount();
  const { network } = useGetNetworkConfig();
  const { signTransactions } = useSignTransactions();
  const { pendingTransactions } = useGetPendingTransactions();
  const { completedTransactions } = useGetCompletedTransactions();
  const { isTransactionPending, isTransactionSuccessful, isTransactionFailed } = useGetActiveTransactionsStatus();
  const { logout } = useLogout();

  const [txAmount, setTxAmount] = useState("0.01");
  const [txReceiver, setTxReceiver] = useState("");
  const [txStatus, setTxStatus] = useState("");

  if (!isLoggedIn) return null;

  const handleSendTx = async () => {
    if (!txReceiver || !txAmount) return;
    setTxStatus("Preparing transaction...");
    try {
      const tx = new Transaction({
        value: `${BigInt(Number(txAmount) * 1e18)}`,
        data: "",
        receiver: new Address(txReceiver),
        gasLimit: new GasLimit(50000 + 1500 * txAmount.length),
        chainID: network.chainId,
      });
      await signTransactions({ transactions: [tx] });
      setTxStatus("Transaction sent! Check your wallet for confirmation.");
      setTimeout(() => refreshAccount(), 3000);
    } catch (e) {
      setTxStatus("Transaction failed or cancelled.");
    }
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 16, margin: "16px 0", boxShadow: "0 2px 8px #0001" }}>
      <h3>Wallet Dashboard</h3>
      <div>
        <b>Address:</b> <span style={{ fontFamily: "monospace" }}>{address}</span>
      </div>
      <div>
        <b>Balance:</b> {Number(balance) / 1e18} EGLD
      </div>
      <div style={{ margin: "12px 0" }}>
        <button onClick={logout}>Logout</button>
      </div>
      <hr />
      <h4>Send EGLD Transaction</h4>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Receiver address"
          value={txReceiver}
          onChange={e => setTxReceiver(e.target.value)}
          style={{ width: 260 }}
        />
        <input
          type="number"
          min="0"
          step="0.0001"
          value={txAmount}
          onChange={e => setTxAmount(e.target.value)}
          style={{ width: 100 }}
        />
        <button onClick={handleSendTx}>Send</button>
      </div>
      <div style={{ minHeight: 24, color: "#3b82f6" }}>{txStatus}</div>
      <hr />
      <h4>Pending Transactions</h4>
      <ul>
        {Object.entries(pendingTransactions).length === 0 && <li>None</li>}
        {Object.entries(pendingTransactions).map(([hash, tx]) => (
          <li key={hash}>
            <a href={`https://devnet-explorer.multiversx.com/transactions/${hash}`} target="_blank" rel="noopener noreferrer">
              {hash}
            </a>
          </li>
        ))}
      </ul>
      <h4>Completed Transactions</h4>
      <ul>
        {Object.entries(completedTransactions).length === 0 && <li>None</li>}
        {Object.entries(completedTransactions).map(([hash, tx]) => (
          <li key={hash}>
            <a href={`https://devnet-explorer.multiversx.com/transactions/${hash}`} target="_blank" rel="noopener noreferrer">
              {hash}
            </a>
          </li>
        ))}
      </ul>
      <div>
        <b>Status:</b>
        {isTransactionPending && <span style={{ color: "#f59e42" }}> Pending</span>}
        {isTransactionSuccessful && <span style={{ color: "#10b981" }}> Success</span>}
        {isTransactionFailed && <span style={{ color: "#ef4444" }}> Failed</span>}
      </div>
    </div>
  );
}
