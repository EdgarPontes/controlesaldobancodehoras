import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { loginUser } from "./auth";

// Mock the auth module functions
vi.mock("./auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("./auth")>();
  return {
    ...original,
    loginUser: vi.fn(),
  };
});

type CookieCall = {
  name: string;
  val: string;
  options: Record<string, unknown>;
};

function createLoginContext(): { ctx: TrpcContext; cookiesSet: CookieCall[] } {
  const cookiesSet: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string, options: Record<string, unknown>) => {
        cookiesSet.push({ name, val, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, cookiesSet };
}

describe("auth.login cookie persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets a persistent cookie when keepConnected is true", async () => {
    const { ctx, cookiesSet } = createLoginContext();
    const caller = appRouter.createCaller(ctx);

    const mockUser = {
      id: 1,
      email: "test@example.com",
      name: "Test User",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    vi.mocked(loginUser).mockResolvedValue({
      user: mockUser as any,
      token: "mock-jwt-token-persistent",
    });

    const result = await caller.auth.login({
      email: "test@example.com",
      password: "password123",
      keepConnected: true,
    });

    expect(result.id).toBe(1);
    expect(cookiesSet).toHaveLength(1);
    expect(cookiesSet[0]?.name).toBe(COOKIE_NAME);
    expect(cookiesSet[0]?.val).toBe("mock-jwt-token-persistent");
    expect(cookiesSet[0]?.options).toMatchObject({
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  });

  it("sets a session cookie (no maxAge) when keepConnected is false", async () => {
    const { ctx, cookiesSet } = createLoginContext();
    const caller = appRouter.createCaller(ctx);

    const mockUser = {
      id: 2,
      email: "test2@example.com",
      name: "Test User 2",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    vi.mocked(loginUser).mockResolvedValue({
      user: mockUser as any,
      token: "mock-jwt-token-session",
    });

    const result = await caller.auth.login({
      email: "test2@example.com",
      password: "password123",
      keepConnected: false,
    });

    expect(result.id).toBe(2);
    expect(cookiesSet).toHaveLength(1);
    expect(cookiesSet[0]?.name).toBe(COOKIE_NAME);
    expect(cookiesSet[0]?.val).toBe("mock-jwt-token-session");
    expect(cookiesSet[0]?.options).toMatchObject({
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
    // For session cookies, maxAge should not be defined
    expect(cookiesSet[0]?.options.maxAge).toBeUndefined();
  });
});
