import type { NextRequest } from "next/server";
import { ApiError, json, readJson, respond } from "@/lib/server/http";
import { authorize } from "@/lib/server/wallet-session";
import { advanceRun, automationEnabled, evaluateTreasury, listRuns, vetoRun } from "@/lib/server/treasury-automation-service";

export const maxDuration = 60;

async function authorizeAutomation(request: NextRequest) {
  const access = await authorize(request);
  if (!automationEnabled(access.vault)) throw new ApiError(404, "La automatización está desactivada para este vault.");
  return access;
}

export function GET(request: NextRequest) {
  return respond(async () => {
    const { vault } = await authorizeAutomation(request);
    const runs = await listRuns(vault);
    return json({ runs, serverNow: Date.now() });
  });
}

export function POST(request: NextRequest) {
  return respond(async () => {
    const body = await readJson(request);
    const access = await authorizeAutomation(request);
    if (body.action === "evaluate") {
      if ((body.mode !== "demo" && body.mode !== "normal") || (body.scenario !== "surge" && body.scenario !== "normal")) {
        throw new ApiError(400, "Elegí un modo y un escenario de actividad válidos.");
      }
      const run = await evaluateTreasury(access, body.mode, body.scenario);
      return json({ run, serverNow: Date.now() });
    }
    if (typeof body.id !== "string" || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(body.id)) {
      throw new ApiError(400, "La referencia de evaluación es inválida.");
    }
    if (body.action !== "veto" && body.action !== "advance") throw new ApiError(400, "Acción de tesorería inválida.");
    const run = body.action === "veto" ? await vetoRun(access.vault, body.id) : await advanceRun(access, body.id);
    return json({ run, serverNow: Date.now() });
  });
}
