import { NextResponse, type NextRequest } from "next/server";
import { ApiError, assertTrustedOrigin, readBoundedJson, resolveAppOrigin } from "./request-guards";

export { ApiError } from "./request-guards";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function respond(action: () => Promise<NextResponse>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    // No registrar cuerpos, cookies, firmas, credenciales ni cadenas de conexión.
    console.error("Fallo de API intercompany", error instanceof Error ? error.name : "ErrorDesconocido", typeof error === "object" && error && "code" in error ? error.code : "");
    return json({ error: "No se pudo consultar Fuji o Postgres. Volvé a intentar." }, 503);
  }
}

export function appOrigin(request: NextRequest) {
  return resolveAppOrigin(request.url, process.env.APP_ORIGIN, process.env.NODE_ENV === "production");
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  assertTrustedOrigin(request, appOrigin(request));
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(415, "Enviá la solicitud como JSON.");
  }
  return readBoundedJson(request);
}
