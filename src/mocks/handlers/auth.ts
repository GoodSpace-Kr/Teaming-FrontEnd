import { http, HttpResponse } from "msw";
import { path, getBearerToken } from "./_shared";
import { getOrCreateUserByEmail } from "../db/store";
import { makeFakeJwt, decodeFakeJwt } from "../utils/jwt";
import { mockDelay } from "../utils/delay";

interface SignInBody {
  email: string;
  password: string;
}

interface SignUpBody {
  email: string;
  password: string;
  name: string;
  avatarKey?: string | null;
  avatarVersion?: number;
}

interface SocialTokenBody {
  accessToken: string;
}

function issueTokens(userId: number, email: string) {
  return {
    accessToken: makeFakeJwt({ userId, email, type: "access" }),
    refreshToken: makeFakeJwt({ userId, email, type: "refresh" }, 30 * 24 * 60 * 60),
  };
}

export const authHandlers = [
  http.post(path("/api/auth/teaming/sign-in"), async ({ request }) => {
    await mockDelay();
    const { email } = (await request.json()) as SignInBody;
    // 목업 모드: 비밀번호는 검증하지 않고 이메일만으로 로그인 처리
    const user = getOrCreateUserByEmail(email);
    return HttpResponse.json({ ...issueTokens(user.id, user.email), name: user.name });
  }),

  http.post(path("/api/auth/teaming/sign-up"), async ({ request }) => {
    await mockDelay();
    const body = (await request.json()) as SignUpBody;
    const user = getOrCreateUserByEmail(body.email, body.name);
    return HttpResponse.json(issueTokens(user.id, user.email));
  }),

  http.post(path("/api/auth/web/:provider"), async ({ request, params }) => {
    await mockDelay();
    const provider = params.provider as string;
    await request.json().catch(() => ({}) as SocialTokenBody);
    // 소셜 로그인은 프로바이더별로 유저를 구분할 정보가 없으므로 데모 유저로 고정
    const user = getOrCreateUserByEmail(`${provider}-demo@teaming.app`, "소셜 데모 사용자");
    return HttpResponse.json({ ...issueTokens(user.id, user.email), expiresIn: 604800, userId: user.id });
  }),

  http.post(path("/users/me/access-token"), async ({ request }) => {
    await mockDelay();
    const refreshToken = getBearerToken(request);
    const payload = refreshToken ? decodeFakeJwt(refreshToken) : null;
    const userId = payload?.userId ?? 1;
    const email = payload?.email ?? "demo@teaming.app";
    return HttpResponse.json({ ...issueTokens(userId, email), expiresIn: 604800, userId });
  }),

  http.post(path("/api/auth/logout"), async () => {
    await mockDelay(100);
    return new HttpResponse(null, { status: 200 });
  }),

  http.post(path("/email/send-code"), async () => {
    await mockDelay(200);
    return HttpResponse.json({ message: "인증코드가 전송되었습니다. (목업: 000000)" });
  }),

  http.post(path("/email/verify-code"), async () => {
    await mockDelay(150);
    return HttpResponse.json({ verified: true });
  }),
];
