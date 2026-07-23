import { http, HttpResponse } from "msw";
import { path, requireAuth, isAuthError } from "./_shared";
import { store, getMember } from "../db/store";
import { mockDelay } from "../utils/delay";

export const chatHandlers = [
  http.get(path("/rooms/:roomId/messages"), async ({ request, params }) => {
    await mockDelay(150);
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 50;
    const cursorParam = url.searchParams.get("cursor");
    const cursorId = cursorParam ? Number(cursorParam) : null;

    const all = store.messages.get(roomId) || []; // messageId 오름차순
    const pool = cursorId ? all.filter((m) => m.messageId < cursorId) : all;
    const page = pool.slice(-limit); // pool 안에서 가장 최근 limit개 (오름차순 유지)
    const items = [...page].reverse(); // 응답은 최신순

    return HttpResponse.json({
      items,
      hasNext: pool.length > limit,
      nextCursor: items.length > 0 ? items[items.length - 1].messageId : null,
    });
  }),

  http.post(path("/rooms/:roomId/read"), async ({ request, params }) => {
    await mockDelay(100);
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const body = (await request.json().catch(() => ({}))) as { lastReadMessageId?: number | null };
    const member = getMember(roomId, auth);

    if (member) {
      const messages = store.messages.get(roomId) || [];
      member.lastReadMessageId = body.lastReadMessageId ?? messages[messages.length - 1]?.messageId ?? member.lastReadMessageId;
    }

    return new HttpResponse(null, { status: 200 });
  }),
];
