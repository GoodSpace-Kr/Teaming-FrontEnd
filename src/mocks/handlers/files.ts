import { http, HttpResponse } from "msw";
import { path, requireAuth, isAuthError } from "./_shared";
import { store, nextId } from "../db/store";
import { BACKEND_URL } from "../env";
import { mockDelay } from "../utils/delay";
import type { FileRecord } from "../db/types";

interface IntentBody {
  fileName: string;
  contentType: string;
  size: number;
}

interface CompleteBody {
  key: string;
}

const IMAGE_PLACEHOLDER = "/good_space1.jpg";

function inferType(contentType: string): FileRecord["type"] {
  if (contentType.startsWith("image/")) return "IMAGE";
  if (contentType.startsWith("video/")) return "VIDEO";
  if (contentType.startsWith("audio/")) return "AUDIO";
  return "FILE";
}

export const filesHandlers = [
  http.get(path("/rooms/:roomId/files"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    return HttpResponse.json(store.files.get(roomId) || []);
  }),

  http.post(path("/files/intent/:roomId"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const body = (await request.json()) as IntentBody;
    const key = `mock/chat/${roomId}/${Date.now()}-${body.fileName}`;
    store.pendingUploads.set(key, {
      key,
      roomId,
      ownerType: "CHAT",
      contentType: body.contentType,
      fileName: body.fileName,
      size: body.size,
    });

    return HttpResponse.json({ url: `${BACKEND_URL}/mock-s3-upload/${encodeURIComponent(key)}`, key });
  }),

  // 가짜 S3 PUT — 바이트를 실제로 저장하지 않고 200만 반환
  http.put(path("/mock-s3-upload/:key"), async () => {
    await mockDelay(200);
    return new HttpResponse(null, { status: 200 });
  }),

  http.post(path("/files/complete/:roomId"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const { key } = (await request.json()) as CompleteBody;
    const pending = store.pendingUploads.get(key);
    store.pendingUploads.delete(key);

    const fileId = nextId("fileId");
    const type = inferType(pending?.contentType || "application/octet-stream");
    const record: FileRecord = {
      fileId,
      roomId,
      uploaderId: auth,
      sortOrder: (store.files.get(roomId) || []).length,
      name: pending?.fileName || `file-${fileId}`,
      type,
      mimeType: pending?.contentType || "application/octet-stream",
      byteSize: pending?.size || 0,
      width: type === "IMAGE" ? 1200 : null,
      height: type === "IMAGE" ? 800 : null,
      durationMs: null,
      previewUrl: type === "IMAGE" ? IMAGE_PLACEHOLDER : null,
      thumbnailUrl: type === "IMAGE" ? IMAGE_PLACEHOLDER : null,
      downloadUrl: IMAGE_PLACEHOLDER,
      antiVirusScanStatus: "PASSED",
      transcodeStatus: "NONE",
      ready: true,
    };

    const list = store.files.get(roomId) || [];
    list.push(record);
    store.files.set(roomId, list);

    return HttpResponse.json({ fileId });
  }),

  http.post(path("/files/download-url/:fileId"), async ({ request, params }) => {
    await mockDelay(100);
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const fileId = Number(params.fileId);
    let found: FileRecord | undefined;
    for (const list of store.files.values()) {
      found = list.find((f) => f.fileId === fileId);
      if (found) break;
    }

    return HttpResponse.json({ url: found?.downloadUrl || IMAGE_PLACEHOLDER });
  }),
];
