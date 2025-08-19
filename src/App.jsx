import MultiversxProvider from "./MultiversxProvider";
import WalletConnectButton from "./WalletConnectButton";
import MultiversxDashboard from "./MultiversxDashboard";
import KwaxelGenerator from "./KwaxelGenerator";

export default function App() {
  return (
    <MultiversxProvider>
      <div style={{ minHeight: "100svh", background: "#afd7ffff" }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "flex-end" }}>
          <WalletConnectButton />
        </div>
        <MultiversxDashboard />
        <KwaxelGenerator />
      </div>
    </MultiversxProvider>
  );
}
