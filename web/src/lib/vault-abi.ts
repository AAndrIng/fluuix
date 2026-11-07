// Subset of the TreasuryVault.sol ABI used by the intercompany flow.
import { parseAbi } from "viem";

export const vaultAbi = parseAbi([
  "function token() view returns (address)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function verOperativas() view returns ((string nombre, uint256 saldo, uint256 minimo, uint256 objetivo, bool activa)[])",
  "function transferirInterno(uint256 desde, uint256 hacia, uint256 monto, string concepto)",
  "event TransferenciaInterna(uint256 indexed desde, uint256 indexed hacia, uint256 monto, string concepto)",
  "error OperativaInvalida(uint256 id)",
  "error SaldoInsuficiente(uint256 id, uint256 pedido, uint256 disponible)",
  "error ParametrosInvalidos()",
  "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
]);
