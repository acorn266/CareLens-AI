// Extracts the Supabase access token from an `Authorization: Bearer <token>`
// header. Returns undefined when the header is missing or holds a junk value
// such as "Bearer null" (sent when a client has no session). The token is only
// extracted here; it is validated by Supabase Auth in getUserScopedClient().
export function getBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || token === "null" || token === "undefined") return undefined;
  return token;
}
