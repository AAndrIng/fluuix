import RailDashboard from "@/components/rail-dashboard";
import ChainIntercompany from "@/components/chain-intercompany";
import { treasuryConfig } from "@/lib/config";

export default function DashboardPage() {
  return treasuryConfig.mode === "chain" ? <ChainIntercompany view="dashboard"/> : <RailDashboard/>;
}
