// 서명 없는 가짜 JWT. route.ts의 extractUserIdFromToken/getTokenExpiration이
// atob(token.split(".")[1])로 payload만 그대로 디코딩하고(base64url 변환 없이)
// 서명 검증은 하지 않으므로, 표준 base64(btoa/atob)로만 인코딩하면 실제
// NextAuth 로직을 수정 없이 그대로 통과한다. btoa/atob는 브라우저·서비스워커·
// Node 18+ 전부에서 전역으로 사용 가능하다.

export interface FakeJwtPayload {
  userId: number;
  email?: string;
  type?: "access" | "refresh";
  [key: string]: unknown;
}

export function makeFakeJwt(payload: FakeJwtPayload, expiresInSeconds = 7 * 24 * 60 * 60): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = btoa(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    })
  );
  return `${header}.${body}.mocksignature`;
}

export function decodeFakeJwt(token: string): (FakeJwtPayload & { iat: number; exp: number }) | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}
