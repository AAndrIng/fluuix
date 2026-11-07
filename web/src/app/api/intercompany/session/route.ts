import type { NextRequest } from "next/server";
import { readJson, respond } from "@/lib/server/http";
import { closeSession, startOrVerifySession } from "@/lib/server/wallet-session";

export function POST(request: NextRequest) {
  return respond(async () => {
    const body = await readJson(request);
    return body.disconnect === true ? closeSession(request) : startOrVerifySession(request, body);
  });
}
