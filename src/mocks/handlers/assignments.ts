import { http, HttpResponse } from "msw";
import { path, requireAuth, isAuthError } from "./_shared";
import { store, nextId } from "../db/store";
import { mockDelay } from "../utils/delay";

interface CreateAssignmentBody {
  title: string;
  description: string;
  assignedMemberIds: number[];
  due: string;
}

interface SubmitAssignmentBody {
  assignmentId: number;
  description: string;
  fileIds: number[];
}

export const assignmentsHandlers = [
  http.get(path("/rooms/:roomId/assignments"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const list = (store.assignments.get(roomId) || []).filter((a) => !a.isCancelled);
    return HttpResponse.json(list);
  }),

  http.post(path("/rooms/:roomId/assignments"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const body = (await request.json()) as CreateAssignmentBody;
    const creator = store.users.get(auth);
    const list = store.assignments.get(roomId) || [];
    list.push({
      assignmentId: nextId("assignmentId"),
      roomId,
      title: body.title,
      description: body.description,
      assignedMemberIds: body.assignedMemberIds,
      due: body.due,
      status: "IN_PROGRESS",
      creatorId: auth,
      creatorName: creator?.name || "",
      createdAt: new Date().toISOString(),
      isCancelled: false,
      submissions: [],
    });
    store.assignments.set(roomId, list);
    return new HttpResponse(null, { status: 200 });
  }),

  http.delete(path("/rooms/:roomId/assignments/:assignmentId"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const assignmentId = Number(params.assignmentId);
    const list = store.assignments.get(roomId) || [];
    const target = list.find((a) => a.assignmentId === assignmentId);
    if (target) {
      target.isCancelled = true;
      target.status = "CANCELED";
    }
    return new HttpResponse(null, { status: 200 });
  }),

  http.post(path("/rooms/:roomId/assignments/submit"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const body = (await request.json()) as SubmitAssignmentBody;
    const list = store.assignments.get(roomId) || [];
    const target = list.find((a) => a.assignmentId === body.assignmentId);
    if (!target) return HttpResponse.json({ message: "과제를 찾을 수 없습니다." }, { status: 404 });

    const files = (store.files.get(roomId) || []).filter((f) => body.fileIds.includes(f.fileId));
    const now = new Date().toISOString();
    const submission = {
      submitterId: auth,
      description: body.description,
      createdAt: now,
      updatedAt: now,
      files: files.map((f) => ({
        fileId: f.fileId,
        fileName: f.name,
        fileType: (f.type === "IMAGE"
          ? "IMAGE"
          : f.type === "VIDEO"
            ? "VIDEO"
            : f.type === "AUDIO"
              ? "AUDIO"
              : "DOCUMENT") as "IMAGE" | "DOCUMENT" | "VIDEO" | "AUDIO" | "OTHER",
        mimeType: f.mimeType,
        fileSize: f.byteSize,
      })),
    };

    const existingIdx = target.submissions.findIndex((s) => s.submitterId === auth);
    if (existingIdx >= 0) target.submissions[existingIdx] = submission;
    else target.submissions.push(submission);

    return new HttpResponse(null, { status: 200 });
  }),
];
