import { http, HttpResponse } from "msw";
import { path, requireAuth, isAuthError } from "./_shared";
import { store } from "../db/store";
import { mockDelay } from "../utils/delay";

export const gifticonHandlers = [
  http.get(path("/gifticon"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url);
    const email = url.searchParams.get("email") || store.users.get(auth)?.email || "";
    return HttpResponse.json(store.gifticons.get(email) || []);
  }),
];
