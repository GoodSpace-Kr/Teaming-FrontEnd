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

// 시드에 없는 이메일로 로그인/회원가입해도 방이 하나도 없어 화면이 텅 비지
// 않도록, 새로 생기는 유저는 자동으로 데모 방 몇 개에 멤버로 들어가 있게 한다.
const DEFAULT_ROOMS_FOR_NEW_USER = [101, 104];

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
    avatarUrl: "",
  };
  store.users.set(id, user);

  for (const roomId of DEFAULT_ROOMS_FOR_NEW_USER) {
    const members = store.roomMembers.get(roomId);
    if (!members || members.some((m) => m.memberId === id)) continue;
    members.push({
      memberId: id,
      name: user.name,
      avatarKey: user.avatarKey,
      avatarVersion: user.avatarVersion,
      avatarUrl: user.avatarUrl,
      roomRole: "MEMBER",
      lastReadMessageId: 0,
      paid: true,
      entered: true,
    });
  }

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
