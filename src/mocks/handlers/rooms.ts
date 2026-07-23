import { http, HttpResponse } from "msw";
import { path, requireAuth, isAuthError } from "./_shared";
import { store, nextId, getRoomsForUser, isRoomLeader } from "../db/store";
import { mockDelay } from "../utils/delay";
import type { RoomRecord } from "../db/types";

function buildRoomData(room: RoomRecord, forUserId: number) {
  const members = store.roomMembers.get(room.roomId) || [];
  const me = members.find((m) => m.memberId === forUserId);
  const messages = store.messages.get(room.roomId) || [];
  const lastMessage = messages[messages.length - 1];

  const unreadCount = me ? messages.filter((m) => m.messageId > me.lastReadMessageId).length : 0;

  return {
    roomId: room.roomId,
    role: me?.roomRole || "MEMBER",
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.messageId,
          type: lastMessage.type,
          content: lastMessage.content,
          sender: {
            id: lastMessage.sender.id ?? 0,
            name: lastMessage.sender.name,
            avatarUrl: lastMessage.sender.avatarUrl ?? "",
            avatarVersion: lastMessage.sender.avatarVersion ?? 0,
          },
          createdAt: lastMessage.createdAt,
        }
      : null,
    title: room.title,
    imageKey: room.imageKey,
    imageVersion: room.imageVersion,
    type: room.type,
    memberCount: members.length,
    success: room.success,
    members: members.map((m) => ({
      memberId: m.memberId,
      lastReadMessageId: m.lastReadMessageId,
      name: m.name,
      avatarKey: m.avatarKey,
      avatarVersion: m.avatarVersion,
      avatarUrl: m.avatarUrl,
      roomRole: m.roomRole,
    })),
    avatarUrl: room.avatarUrl,
    paymentStatus: room.type.typeName === "DEMO" || me?.paid ? "PAID" : "NOT_PAID",
    ready: {
      everyMemberEntered: members.every((m) => m.entered),
      everyMemberPaid: members.every((m) => m.paid),
    },
  };
}

interface CreateRoomBody {
  title: string;
  description: string;
  memberCount: number;
  roomType: "BASIC" | "STANDARD" | "ELITE" | "DEMO";
}

const ROOM_TYPE_PRESET: Record<CreateRoomBody["roomType"], { price: number; description: string }> = {
  BASIC: { price: 5000, description: "메가커피 기프티콘" },
  STANDARD: { price: 8000, description: "스타벅스 기프티콘" },
  ELITE: { price: 12000, description: "스타벅스 기프티콘(대)" },
  DEMO: { price: 0, description: "무료 체험" },
};

export const roomsHandlers = [
  http.get(path("/rooms"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const rooms = getRoomsForUser(auth).map((room) => buildRoomData(room, auth));
    return HttpResponse.json(rooms);
  }),

  http.post(path("/rooms"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = (await request.json()) as CreateRoomBody;
    const roomId = nextId("roomId");
    const inviteCode = `RM${roomId}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const preset = ROOM_TYPE_PRESET[body.roomType] || ROOM_TYPE_PRESET.BASIC;

    store.rooms.set(roomId, {
      roomId,
      title: body.title,
      description: body.description,
      imageKey: "",
      imageVersion: 0,
      avatarUrl: "/good_space1.jpg",
      type: { typeName: body.roomType, price: preset.price, description: preset.description },
      inviteCode,
      leaderId: auth,
      success: false,
      createdAt: new Date().toISOString(),
    });

    const user = store.users.get(auth)!;
    store.roomMembers.set(roomId, [
      {
        memberId: auth,
        name: user.name,
        avatarKey: user.avatarKey,
        avatarVersion: user.avatarVersion,
        avatarUrl: user.avatarUrl,
        roomRole: "LEADER",
        lastReadMessageId: 0,
        paid: true,
        entered: true,
      },
    ]);
    store.messages.set(roomId, []);
    store.assignments.set(roomId, []);
    store.files.set(roomId, []);

    return HttpResponse.json({ roomId, inviteCode });
  }),

  http.get(path("/rooms/search"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url);
    const inviteCode = url.searchParams.get("inviteCode");
    const room = [...store.rooms.values()].find((r) => r.inviteCode === inviteCode);
    if (!room) return HttpResponse.json({ message: "존재하지 않는 초대 코드입니다." }, { status: 404 });

    const members = store.roomMembers.get(room.roomId) || [];
    return HttpResponse.json({
      title: room.title,
      imageKey: room.imageKey,
      imageVersion: room.imageVersion,
      type: room.type,
      currentMemberCount: members.length,
      maxMemberCount: members.length + 5,
    });
  }),

  http.post(path("/rooms/invite"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { inviteCode } = (await request.json()) as { inviteCode: string };
    const room = [...store.rooms.values()].find((r) => r.inviteCode === inviteCode);
    if (!room) return HttpResponse.json({ message: "존재하지 않는 초대 코드입니다." }, { status: 404 });

    const members = store.roomMembers.get(room.roomId) || [];
    if (members.some((m) => m.memberId === auth)) {
      return HttpResponse.json({ message: "이미 참여한 방입니다." }, { status: 409 });
    }

    const user = store.users.get(auth)!;
    members.push({
      memberId: auth,
      name: user.name,
      avatarKey: user.avatarKey,
      avatarVersion: user.avatarVersion,
      avatarUrl: user.avatarUrl,
      roomRole: "MEMBER",
      lastReadMessageId: 0,
      paid: room.type.typeName === "DEMO",
      entered: true,
    });
    store.roomMembers.set(room.roomId, members);

    return HttpResponse.json({ roomId: room.roomId });
  }),

  http.get(path("/rooms/:roomId/invite"), async ({ request, params }) => {
    await mockDelay(150);
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    if (!isRoomLeader(roomId, auth)) {
      return HttpResponse.json({ message: "팀장이 아닙니다." }, { status: 400 });
    }
    const room = store.rooms.get(roomId);
    return HttpResponse.json({ inviteCode: room?.inviteCode || "" });
  }),

  http.patch(path("/rooms/:roomId/success"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const room = store.rooms.get(roomId);
    if (room) room.success = true;
    return new HttpResponse(null, { status: 200 });
  }),

  http.delete(path("/rooms/:roomId"), async ({ request, params }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const roomId = Number(params.roomId);
    const members = store.roomMembers.get(roomId) || [];
    store.roomMembers.set(
      roomId,
      members.filter((m) => m.memberId !== auth)
    );
    return new HttpResponse(null, { status: 200 });
  }),

  http.get(path("/rooms/assignments"), async ({ request }) => {
    await mockDelay();
    const auth = requireAuth(request);
    if (isAuthError(auth)) return auth;

    const myRoomIds = new Set(getRoomsForUser(auth).map((r) => r.roomId));
    const result = [...store.assignments.entries()]
      .filter(([roomId]) => myRoomIds.has(roomId))
      .flatMap(([roomId, list]) =>
        list
          .filter((a) => !a.isCancelled)
          .map((a) => ({
            assignmentId: a.assignmentId,
            roomId,
            title: a.title,
            description: a.description,
            due: a.due,
            status: a.status,
          }))
      );
    return HttpResponse.json(result);
  }),
];
