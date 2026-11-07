export const treasuryConfig = {
  mode: process.env.NEXT_PUBLIC_MODE ?? "mock",
  chainId: 43113,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc",
  tokenAddress: process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "",
  vaultAddress: process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "",
  deployBlock: process.env.NEXT_PUBLIC_VAULT_DEPLOY_BLOCK ?? "",
  explorerUrl: "https://testnet.snowtrace.io",
} as const;
