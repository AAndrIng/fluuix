import RailDashboard from "@/components/rail-dashboard";
import ChainIntercompany from "@/components/chain-intercompany";
import { treasuryConfig } from "@/lib/config";

export default function TransferPage() {
  return treasuryConfig.mode === "chain" ? <ChainIntercompany view="mover"/> : <RailDashboard view="mover"/>;
}
