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

function logAuth(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [auth] ${message}`);
}

export async function authenticateRequest(
  req: Request
): Promise<User | null> {
  // 1. Try cookie
  const cookies = parseCookies(req.headers.cookie);
  let sessionToken = cookies.get(COOKIE_NAME);

  // Debug logging
  logAuth(`Cookie header: ${req.headers.cookie ? "present" : "missing"}`);
  logAuth(`Session token from cookie: ${sessionToken ? "found" : "missing"}`);
  logAuth(`Host: ${req.headers.host}`);

  // 2. Fallback to Authorization header
  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7);
      logAuth("Session token from Authorization header: found");
    }
  }

  if (!sessionToken) {
    logAuth("No session token found, returning null");
    return null;
  }

  const session = await verifySessionToken(sessionToken);
  if (!session) {
    logAuth("Invalid session token, returning null");
    return null;
  }

  const user = await db.getUserById(session.userId);
  if (!user) {
    logAuth("User not found in DB, returning null");
    return null;
  }

  logAuth(`User authenticated: ${user.email}`);
  return user;
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

  // Extract domain from host header (e.g., "controleponto.tecpontes.com.br" from "controleponto.tecpontes.com.br:443")
  let domain: string | undefined = undefined;
  const host = req.headers.host;
  if (host) {
    const hostname = host.split(":")[0];
    // Only set domain for non-localhost domains
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      domain = hostname;
    }
  }

  return {
    httpOnly: true,
    path: "/",
    domain,
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure,
  };
}