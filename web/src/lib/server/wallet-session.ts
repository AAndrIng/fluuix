import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { isAddress, verifyMessage, type Address, type Hex } from "viem";
import { consumeChallenge } from "./intercompany-db";
import { requireTreasurer, vaultSettings } from "./fuji";
import { ApiError, appOrigin, json } from "./http";

const challengeCookie = "fluuix_wallet_challenge";
const sessionCookie = "fluuix_treasurer";
const challengeAge = 300;
const sessionAge = 1800;

type Credential = { type: "challenge" | "session"; wallet: Address; vault: Address; origin: string; nonce: string; expiresAt: number };

function mac(value: string) {
  const secret = process.env.INTERCOMPANY_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, "Falta configurar el secreto de sesión.");
  return createHmac("sha256", secret).update(value).digest();
}

function encode(credential: Credential) {
  const payload = Buffer.from(JSON.stringify(credential)).toString("base64url");
  return `${payload}.${mac(payload).toString("base64url")}`;
}

function decode(token: string | undefined, type: Credential["type"], vault: Address, origin: string): Credential | null {
  if (!token || !/^[\w-]+\.[\w-]+$/.test(token)) return null;
  const [payload, signature] = token.split(".");
  const supplied = Buffer.from(signature, "base64url");
  const expected = mac(payload);
  if (expected.length !== supplied.length || !timingSafeEqual(supplied, expected)) return null;
  const credential = JSON.parse(Buffer.from(payload, "base64url").toString()) as Credential;
  return credential.type === type && credential.vault === vault && credential.origin === origin &&
    credential.expiresAt > Date.now() && isAddress(credential.wallet) ? credential : null;
}

function setCookie(response: NextResponse, origin: string, name: string, value: string, maxAge: number) {
  response.cookies.set(name, value, {
    httpOnly: true, sameSite: "strict", secure: new URL(origin).protocol === "https:",
    path: "/api/intercompany", maxAge,
  });
}

function challengeMessage(challenge: Credential) {
  return [
    "Fluuix — acceso al registro intercompany",
    `Sitio: ${challenge.origin}`,
    "Red: Avalanche Fuji (43113)",
    `Vault: ${challenge.vault}`,
    `Wallet: ${challenge.wallet}`,
    `Nonce: ${challenge.nonce}`,
    `Vence: ${new Date(challenge.expiresAt).toISOString()}`,
    "Esta firma abre una sesión. No ejecuta una transferencia.",
  ].join("\n");
}

export async function startOrVerifySession(request: NextRequest, body: Record<string, unknown>) {
  const { vault } = vaultSettings();
  const origin = appOrigin(request);
  if (typeof body.wallet !== "string" || !isAddress(body.wallet)) throw new ApiError(400, "La dirección de wallet es inválida.");
  const wallet = body.wallet.toLowerCase() as Address;
  if (body.signature === undefined) {
    const challenge: Credential = {
      type: "challenge", wallet, vault, origin, nonce: randomUUID(), expiresAt: Date.now() + challengeAge * 1000,
    };
    const response = json({ message: challengeMessage(challenge) });
    setCookie(response, origin, challengeCookie, encode(challenge), challengeAge);
    return response;
  }
  const challenge = decode(request.cookies.get(challengeCookie)?.value, "challenge", vault, origin);
  if (!challenge || challenge.wallet !== wallet) throw new ApiError(401, "El desafío de firma venció. Conectá la wallet de nuevo.");
  if (typeof body.signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(body.signature)) {
    throw new ApiError(400, "La firma de wallet es inválida.");
  }
  const valid = await verifyMessage({ address: wallet, message: challengeMessage(challenge), signature: body.signature as Hex }).catch(() => false);
  if (!valid) throw new ApiError(401, "No se pudo verificar la firma.");
  await requireTreasurer(vault, wallet);
  if (challenge.expiresAt <= Date.now() || !await consumeChallenge(challenge.nonce, challenge.expiresAt)) {
    throw new ApiError(401, "El desafío ya se usó o venció. Conectá la wallet de nuevo.");
  }
  const session: Credential = {
    ...challenge, type: "session", nonce: randomUUID(), expiresAt: Date.now() + sessionAge * 1000,
  };
  const response = json({ wallet });
  setCookie(response, origin, challengeCookie, "", 0);
  setCookie(response, origin, sessionCookie, encode(session), sessionAge);
  return response;
}

export async function authorize(request: NextRequest) {
  // Read request cookies first to keep the authenticated GET request-time only.
  const cookie = request.cookies.get(sessionCookie)?.value;
  const settings = vaultSettings();
  const session = decode(cookie, "session", settings.vault, appOrigin(request));
  if (!session) throw new ApiError(401, "Conectá la wallet del tesorero para acceder al registro.");
  await requireTreasurer(settings.vault, session.wallet);
  return { ...settings, wallet: session.wallet };
}

export function closeSession(request: NextRequest) {
  const origin = appOrigin(request);
  const response = json({ ok: true });
  setCookie(response, origin, challengeCookie, "", 0);
  setCookie(response, origin, sessionCookie, "", 0);
  return response;
}
