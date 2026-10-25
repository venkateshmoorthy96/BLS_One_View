"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, checkCredentials } from "./credentials";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "./session";

export type LoginState = { error?: string; username?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!authConfigured()) return { error: "Sign-in is not configured on this server." };
  const username = String(form.get("username") ?? "").slice(0, 200);
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!checkCredentials(username, password)) return { error: "Invalid username or password.", username };
  const token = await signSession(username, process.env.SESSION_SECRET!);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/overview");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
