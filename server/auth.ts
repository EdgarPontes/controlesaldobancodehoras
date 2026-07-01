import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import * as db from "./db";
import type { User } from "../drizzle/schema";

// Hash password using Web Crypto API (Node 22+)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

function getSessionSecret(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(user: User): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

async function verifySessionToken(
  token: string
): Promise<{ userId: number; email: string; name: string | null; role: string } | null> {
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    const { userId, email, name, role } = payload as Record<string, unknown>;

    if (typeof userId !== "number" || typeof email !== "string") {
      return null;
    }

    return {
      userId,
      email,
      name: typeof name === "string" ? name : null,
      role: typeof role === "string" ? role : "user",
    };
  } catch {
    return null;
  }
}

export async function authenticateRequest(
  req: Request
): Promise<User | null> {
  // 1. Try cookie
  const cookies = parseCookies(req.headers.cookie);
  let sessionToken = cookies.get(COOKIE_NAME);

  // 2. Fallback to Authorization header
  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7);
    }
  }

  if (!sessionToken) return null;

  const session = await verifySessionToken(sessionToken);
  if (!session) return null;

  const user = await db.getUserById(session.userId);
  return user || null;
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const parsed = new Map<string, string>();
  cookieHeader.split(";").forEach((pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (key) {
      parsed.set(key, rest.join("="));
    }
  });
  return parsed;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const user = await db.getUserByEmail(email);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  // Update last signed in
  await db.upsertUser({
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    role: user.role,
    lastSignedIn: new Date(),
  });

  const token = await createSessionToken(user);
  return { user, token };
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; token: string }> {
  const passwordHash = await hashPassword(password);

  const user = await db.createUser({
    email,
    name,
    passwordHash,
    role: "user",
  });

  const token = await createSessionToken(user);
  return { user, token };
}

export function getSessionCookieOptions(req: Request) {
  const isSecure =
    req.protocol === "https" ||
    (req.headers["x-forwarded-proto"] || "").toString().toLowerCase() === "https";

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isSecure,
  };
}