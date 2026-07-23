import { http, HttpResponse } from "msw";
import { path, requireAuth, isAuthError } from "./_shared";
import { store, nextId } from "../db/store";
import { BACKEND_URL } from "../env";
import { mockDelay } from "../utils/delay";

interface AvatarIntentBody {
  ownerType: "USER" | "ROOM";
  contentType: string;
  byteSize: number;
  roomId?: number;
}

interface AvatarCompleteBody {
  ownerType: "USER" | "ROOM";
  key: string;
  width: number;
  height: number;
  roomId?: number;
}

const PLACEHOLDER_AVATARS = ["/basicProfile.webp", "/good_space1.jpg", "/megacoffe.webp", "/starbucks.png"];

export const usersHandlers = [
  http.get(path("/users/me"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const user = store.users.get(auth);
    if (!user) return HttpResponse.json({ message: "사용자를 찾을 수 없습니다." }, { status: 404 });

    return HttpResponse.json({
      email: user.email,
      name: user.name,
      avatarKey: user.avatarKey,
      avatarVersion: user.avatarVersion,
      avatarUrl: user.avatarUrl,
    });
  }),

  http.patch(path("/users/me/name"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { name } = (await request.json()) as { name: string };
    const user = store.users.get(auth);
    if (user) user.name = name;
    return HttpResponse.json({ name });
  }),

  http.patch(path("/users/me/email"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { email } = (await request.json()) as { email: string };
    const user = store.users.get(auth);
    if (user) user.email = email;
    return HttpResponse.json({ email });
  }),

  http.patch(path("/users/me/password"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;
    await request.json().catch(() => null);
    return new HttpResponse(null, { status: 200 });
  }),

  http.delete(path("/users/me/log-out"), async ({ request }) => {
    await mockDelay(100);
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;
    return new HttpResponse(null, { status: 200 });
  }),

  http.delete(path("/users/me/withdraw"), async ({ request }) => {
    await mockDelay(200);
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;
    store.users.delete(auth);
    return new HttpResponse(null, { status: 200 });
  }),

  http.post(path("/users/me/avatar/intent"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as AvatarIntentBody;
    const key = `mock/avatar/${body.ownerType.toLowerCase()}/${auth}-${Date.now()}`;
    store.pendingUploads.set(key, {
      key,
      roomId: body.roomId ?? null,
      ownerType: body.ownerType,
      contentType: body.contentType,
      fileName: key,
      size: body.byteSize,
    });

    return HttpResponse.json({
      key,
      bucket: "mock-bucket",
      url: `${BACKEND_URL}/mock-s3-upload/${encodeURIComponent(key)}`,
      version: 1,
      requiredHeaders: {},
    });
  }),

  http.post(path("/users/me/avatar/complete"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as AvatarCompleteBody;
    const pending = store.pendingUploads.get(body.key);
    store.pendingUploads.delete(body.key);

    const placeholder = PLACEHOLDER_AVATARS[nextId("fileId") % PLACEHOLDER_AVATARS.length];
    const avatarKey = `mock-avatar-${Date.now()}`;
    const avatarVersion = Date.now() % 100000;

    if (body.ownerType === "USER") {
      const user = store.users.get(auth);
      if (user) {
        user.avatarKey = avatarKey;
        user.avatarVersion = avatarVersion;
        user.avatarUrl = placeholder;
      }
    } else if (body.ownerType === "ROOM" && (body.roomId ?? pending?.roomId)) {
      const roomId = (body.roomId ?? pending?.roomId) as number;
      const room = store.rooms.get(roomId);
      if (room) {
        room.imageKey = avatarKey;
        room.imageVersion = avatarVersion;
        room.avatarUrl = placeholder;
      }
    }

    return HttpResponse.json({ avatarKey, avatarVersion, publicUrl: placeholder });
  }),
];
