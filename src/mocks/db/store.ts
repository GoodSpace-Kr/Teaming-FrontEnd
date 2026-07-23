import type {
  UserRecord,
  RoomRecord,
  MemberRecord,
  ChatMessageRecord,
  AssignmentRecord,
  FileRecord,
  GifticonRecord,
  PendingUpload,
} from "./types";
import { seedStore } from "./seed";

export interface MockStore {
  users: Map<number, UserRecord>;
  rooms: Map<number, RoomRecord>;
  roomMembers: Map<number, MemberRecord[]>;
  messages: Map<number, ChatMessageRecord[]>;
  assignments: Map<number, AssignmentRecord[]>;
  files: Map<number, FileRecord[]>;
  gifticons: Map<string, GifticonRecord[]>;
  pendingUploads: Map<string, PendingUpload>;
  counters: {
    userId: number;
    roomId: number;
    messageId: number;
    fileId: number;
    assignmentId: number;
  };
}

function createEmptyStore(): MockStore {
  return {
    users: new Map(),
    rooms: new Map(),
    roomMembers: new Map(),
    messages: new Map(),
    assignments: new Map(),
    files: new Map(),
    gifticons: new Map(),
    pendingUploads: new Map(),
    counters: { userId: 1, roomId: 1, messageId: 1, fileId: 1, assignmentId: 1 },
  };
}

function freshStore(): MockStore {
  const store = createEmptyStore();
  seedStore(store);
  return store;
}

// 모듈이 처음 평가될 때 한 번 시드. 브라우저에서는 페이지(탭)당 한 번,
// 서버(msw/node)에서는 Next 서버 프로세스당 한 번 — 새로고침 시 초기화되는
// "인메모리 스토어" 요구사항과 일치한다.
export const store: MockStore = freshStore();

export function nextId(key: keyof MockStore["counters"]): number {
  return store.counters[key]++;
}

export function getUserByEmail(email: string): UserRecord | undefined {
  for (const user of store.users.values()) {
    if (user.email === email) return user;
  }
  return undefined;
}

export function getOrCreateUserByEmail(email: string, name?: string): UserRecord {
  const existing = getUserByEmail(email);
  if (existing) return existing;

  const id = nextId("userId");
  const user: UserRecord = {
    id,
    email,
    name: name || email.split("@")[0],
    avatarKey: "",
    avatarVersion: 0,
    avatarUrl: "/basicProfile.webp",
  };
  store.users.set(id, user);
  return user;
}

export function getRoomsForUser(userId: number): RoomRecord[] {
  const result: RoomRecord[] = [];
  for (const [roomId, members] of store.roomMembers.entries()) {
    if (members.some((m) => m.memberId === userId)) {
      const room = store.rooms.get(roomId);
      if (room) result.push(room);
    }
  }
  return result;
}

export function getMember(roomId: number, userId: number): MemberRecord | undefined {
  return store.roomMembers.get(roomId)?.find((m) => m.memberId === userId);
}

export function isRoomLeader(roomId: number, userId: number): boolean {
  const room = store.rooms.get(roomId);
  return !!room && room.leaderId === userId;
}
