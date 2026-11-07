import RailDashboard from "@/components/rail-dashboard";
import ChainIntercompany from "@/components/chain-intercompany";
import { automationEnabled } from "@/lib/server/treasury-automation-service";
import { treasuryConfig } from "@/lib/config";

export default function DashboardPage() {
  return treasuryConfig.mode === "chain" ? <ChainIntercompany view="dashboard" automation={automationEnabled(treasuryConfig.vaultAddress)}/> : <RailDashboard/>;
}
