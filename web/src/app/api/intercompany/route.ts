import type { NextRequest } from "next/server";
import { json, readJson, respond } from "@/lib/server/http";
import { authorize } from "@/lib/server/wallet-session";
import { readOperativas } from "@/lib/server/fuji";
import { listOperations } from "@/lib/server/intercompany-db";
import { prepareOperation } from "@/lib/server/intercompany-service";

export function GET(request: NextRequest) {
  return respond(async () => {
    const access = await authorize(request);
    const [operativas, operations] = await Promise.all([readOperativas(access), listOperations(access.vault)]);
    return json({ wallet: access.wallet, vault: access.vault, operativas, operations });
  });
}

export function POST(request: NextRequest) {
  return respond(async () => {
    const body = await readJson(request);
    const access = await authorize(request);
    return json({ operation: await prepareOperation(access, body) });
  });
}
