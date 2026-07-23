import { http, HttpResponse } from "msw";
import { path, requireAuth, isAuthError } from "./_shared";
import { getMember } from "../db/store";
import { mockDelay } from "../utils/delay";

function paymentPageHtml(amount: string, roomId: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>모의 결제</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px;background:#0d1117;color:#c9d1d9">
  <h2>모의 결제 (MSW Mock)</h2>
  <p>결제 금액: ${amount}원</p>
  <p>방 ID: ${roomId}</p>
  <div style="margin-top:24px;display:flex;gap:12px;justify-content:center">
    <button id="ok" style="padding:10px 20px;font-size:15px;cursor:pointer">결제 성공 처리</button>
    <button id="fail" style="padding:10px 20px;font-size:15px;cursor:pointer">결제 실패 처리</button>
  </div>
  <script>
    document.getElementById('ok').onclick = function () {
      window.opener.postMessage({ type: 'PAYMENT_SUCCESS' }, window.location.origin);
      window.close();
    };
    document.getElementById('fail').onclick = function () {
      window.opener.postMessage({ type: 'PAYMENT_FAIL' }, window.location.origin);
      window.close();
    };
  </script>
</body>
</html>`;
}

export const paymentHandlers = [
  http.get(path("/payment/html"), async ({ request }) => {
    await mockDelay(200);
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url);
    const amount = url.searchParams.get("amount") || "0";
    const roomId = url.searchParams.get("roomId") || "";

    // 결제 페이지를 여는 시점에 결제 완료로 간주(목업 단순화) — 팝업의
    // "결제 성공" 버튼을 눌러 postMessage가 오면 프론트가 방 목록을 다시
    // 불러오는데, 그때 이미 paid 상태가 반영되어 있어야 하기 때문.
    const member = getMember(Number(roomId), auth);
    if (member) member.paid = true;

    return new HttpResponse(paymentPageHtml(amount, roomId), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }),

  http.post(path("/payment/cancelAuth"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;
    await request.json().catch(() => null);
    return new HttpResponse(null, { status: 200 });
  }),
];
