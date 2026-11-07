import { NextResponse, type NextRequest } from "next/server";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function respond(action: () => Promise<NextResponse>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("Intercompany API failure", error instanceof Error ? error.name : "UnknownError", typeof error === "object" && error && "code" in error ? error.code : "");
    return json({ error: "No se pudo consultar Fuji o Postgres. Volvé a intentar." }, 503);
  }
}

export function appOrigin(request: NextRequest) {
  return new URL(process.env.APP_ORIGIN || request.url).origin;
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if (origin && origin !== appOrigin(request)) throw new ApiError(403, "Origen de la solicitud inválido.");
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new ApiError(415, "Enviá la solicitud como JSON.");
  }
  try {
    const raw = await request.text();
    if (raw.length > 8192) throw new ApiError(413, "La solicitud excede el tamaño permitido.");
    const body: unknown = JSON.parse(raw);
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
  }
  throw new ApiError(400, "La solicitud JSON es inválida.");
}
