import { HttpResponse } from "msw";
import { decodeFakeJwt } from "../utils/jwt";

// 모든 핸들러가 백엔드 오리진(NEXT_PUBLIC_BACKEND_URL / BACKEND_URL)에 상관없이
// 매치되도록 "*"(임의 오리진) 경로 패턴을 쓴다. 두 URL이 실제로는 항상 같은
// 값을 가리키지만(.env.local 참고), 어긋나더라도 이 패턴이면 문제없다.
export function path(p: string): string {
  return `*${p}`;
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export function getAuthUserId(request: Request): number | null {
  const token = getBearerToken(request);
  if (!token) return null;
  const payload = decodeFakeJwt(token);
  return payload?.userId ?? null;
}

export function requireAuth(request: Request): number | Response {
  const userId = getAuthUserId(request);
  if (userId === null) {
    return HttpResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }
  return userId;
}

export function isAuthError(value: number | Response): value is Response {
  return typeof value !== "number";
}
