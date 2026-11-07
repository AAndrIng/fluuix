import type { NextRequest } from "next/server";
import { json, readJson, respond } from "@/lib/server/http";
import { authorize } from "@/lib/server/wallet-session";
import { confirmOperation } from "@/lib/server/intercompany-service";

export function POST(request: NextRequest, context: RouteContext<"/api/intercompany/[id]/confirmacion">) {
  return respond(async () => {
    const [body, { id }] = await Promise.all([readJson(request), context.params]);
    const access = await authorize(request);
    const result = await confirmOperation(access, id, body.hash);
    return json(result, result.pending ? 202 : 200);
  });
}
