/** Controles HTTP sin dependencias de Next.js, verificables con pruebas aisladas. */
export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export const MAX_JSON_BYTES = 8192;
export const JSON_READ_TIMEOUT_MS = 5000;

/** En producción el origen de confianza viene de configuración, nunca del cliente. */
export function resolveAppOrigin(requestUrl: string, configured: string | undefined, production: boolean): string {
  let url: URL;
  if (production && !configured?.trim()) {
    throw new ApiError(503, "Configurá APP_ORIGIN con el origen HTTPS de la aplicación.");
  }
  try { url = new URL(configured?.trim() || requestUrl); }
  catch { throw new ApiError(503, "APP_ORIGIN no es una URL válida."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      (production && url.protocol !== "https:") ||
      (!production && url.protocol === "http:" && !local) ||
      (configured && (url.pathname !== "/" || url.search || url.hash))) {
    throw new ApiError(503, "APP_ORIGIN debe ser un origen HTTPS sin credenciales, ruta ni parámetros; HTTP solo se admite en loopback durante desarrollo.");
  }
  if (!configured && !local) {
    throw new ApiError(503, "Configurá APP_ORIGIN antes de exponer la aplicación fuera de localhost.");
  }
  return url.origin;
}

/** Estos endpoints usan cookies: las mutaciones requieren Origin explícito y exacto. */
export function assertTrustedOrigin(request: Pick<Request, "headers">, expected: string): void {
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "Origen de la solicitud inválido o ausente.");
  }
}

/** Limita bytes reales, duración total y codificación antes de interpretar el JSON. */
export async function readBoundedJson(
  request: Pick<Request, "headers" | "body" | "signal">,
  timeoutMs = JSON_READ_TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error("El tiempo límite debe ser positivo.");
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding.toLowerCase().trim() !== "identity") {
    throw new ApiError(415, "No se admiten cuerpos comprimidos en esta API.");
  }
  const length = request.headers.get("content-length");
  if (length !== null) {
    if (!/^\d{1,20}$/.test(length)) throw new ApiError(400, "Content-Length es inválido.");
    if (BigInt(length) > BigInt(MAX_JSON_BYTES)) {
      if (request.body) void request.body.cancel().catch(() => {});
      throw new ApiError(413, "La solicitud excede el límite de 8192 bytes.");
    }
  }
  if (!request.body) throw new ApiError(400, "La solicitud JSON está vacía.");
  if (request.signal.aborted) throw new ApiError(408, "Se interrumpió la lectura de la solicitud.");
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    abort = () => reject(new ApiError(408, "Se interrumpió la lectura de la solicitud."));
    request.signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => reject(new ApiError(408, "La solicitud excedió el tiempo de lectura permitido.")), timeoutMs);
    if (request.signal.aborted) abort();
  });
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await Promise.race([reader.read(), interrupted]);
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) throw new ApiError(413, "La solicitud excede el límite de 8192 bytes.");
      chunks.push(value);
    }
    if (length !== null && BigInt(length) !== BigInt(total)) {
      throw new ApiError(400, "Content-Length no coincide con el cuerpo recibido.");
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "La solicitud JSON debe ser un objeto.");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    // Cancelar no debe dejar la respuesta esperando a un emisor lento o desconectado.
    void reader.cancel().catch(() => {});
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "La solicitud JSON es inválida.");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
