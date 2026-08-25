"use client";

type GetToken = () => Promise<string | null>;

export async function fetchWithClerkToken(
  getToken: GetToken,
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const token = await getToken();

  if (!token) {
    throw new Error("Login required.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers
  });
}
