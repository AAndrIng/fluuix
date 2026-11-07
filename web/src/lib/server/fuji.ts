import { createPublicClient, erc20Abi, http, isAddress, keccak256, stringToHex, zeroAddress, type Address } from "viem";
import { avalancheFuji } from "viem/chains";
import { treasuryConfig } from "../config";
import { vaultAbi } from "../vault-abi";
import { ApiError } from "./http";

export const fuji = createPublicClient({
  chain: avalancheFuji,
  transport: http(process.env.AVALANCHE_RPC_URL?.trim() || treasuryConfig.rpcUrl, { timeout: 8000, retryCount: 1 }),
});
const treasurerRole = keccak256(stringToHex("TESORERO"));

export function vaultSettings() {
  const { vaultAddress, tokenAddress, deployBlock } = treasuryConfig;
  if (treasuryConfig.mode !== "chain") throw new ApiError(503, "El modo Avalanche Fuji está desactivado.");
  if (!isAddress(vaultAddress) || !isAddress(tokenAddress) || vaultAddress === zeroAddress || tokenAddress === zeroAddress || !/^\d+$/.test(deployBlock)) {
    throw new ApiError(503, "Faltan la dirección del vault, del token o el bloque de despliegue en Fuji.");
  }
  return {
    vault: vaultAddress.toLowerCase() as Address,
    token: tokenAddress.toLowerCase() as Address,
    deployedAt: BigInt(deployBlock),
  };
}

export async function requireTreasurer(vault: Address, wallet: Address) {
  if (await fuji.getChainId() !== avalancheFuji.id) throw new ApiError(503, "El RPC configurado debe apuntar a Avalanche Fuji.");
  const allowed = await fuji.readContract({ address: vault, abi: vaultAbi, functionName: "hasRole", args: [treasurerRole, wallet] });
  if (!allowed) throw new ApiError(403, "Esta wallet no tiene el rol TESORERO en el vault.");
}

export async function readOperativas(settings: ReturnType<typeof vaultSettings>) {
  const { vault, token } = settings;
  const [vaultToken, decimals, operativas] = await Promise.all([
    fuji.readContract({ address: vault, abi: vaultAbi, functionName: "token" }),
    fuji.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    fuji.readContract({ address: vault, abi: vaultAbi, functionName: "verOperativas" }),
  ]);
  if (vaultToken.toLowerCase() !== token || decimals !== 18) {
    throw new ApiError(503, "El vault debe usar el token ARGt configurado con 18 decimales.");
  }
  return operativas.flatMap((op, id) => op.activa ? [{ id, nombre: op.nombre, saldo: op.saldo.toString() }] : []);
}
