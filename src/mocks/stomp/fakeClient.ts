import type { IMessage, StompConfig } from "@stomp/stompjs";
import { store, nextId, getMember } from "../db/store";
import { decodeFakeJwt } from "../utils/jwt";
import type { ChatMessageRecord } from "../db/types";
import { bus } from "./bus";

interface SendPayload {
  clientMessageId: string;
  content: string | null;
  type: ChatMessageRecord["type"];
  attachmentFileIdsInOrder: number[];
}

// @stomp/stompjs의 Client와 동일한(사용 중인 부분만) 표면을 가진 가짜 구현체.
// 실제 네트워크/SockJS 없이, REST 목업과 같은 인메모리 스토어를 직접 조작한다.
export class FakeStompClient {
  connected = false;
  onConnect?: () => void;
  onStompError?: (frame: { headers: Record<string, string> }) => void;
  onWebSocketClose?: (event?: CloseEvent) => void;
  onWebSocketError?: (event?: Event) => void;

  private userId: number | null;
  private unsubscribers: Array<() => void> = [];
  // React가 개발 모드에서 effect를 mount->cleanup->mount로 두 번 실행할 때
  // (StrictMode), activate()의 setTimeout이 끝나기 전에 deactivate()가 먼저
  // 호출될 수 있다. 이때 deactivated 플래그 없이 그대로 onConnect/subscribe가
  // 실행되면, 이미 "취소된" 이전 인스턴스가 bus에 구독을 남겨 메시지가 두 번
  // 수신되는 문제가 생긴다.
  private deactivated = false;

  constructor(config: StompConfig) {
    const header = config.connectHeaders?.Authorization || config.connectHeaders?.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
    const payload = token ? decodeFakeJwt(token) : null;
    this.userId = payload?.userId ?? null;
  }

  activate(): void {
    this.deactivated = false;
    setTimeout(() => {
      if (this.deactivated) return;
      this.connected = true;
      this.onConnect?.();
    }, 30);
  }

  deactivate(): void {
    this.deactivated = true;
    this.connected = false;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  subscribe(destination: string, callback: (message: IMessage) => void): { unsubscribe(): void } {
    const unsubscribe = bus.subscribe(destination, callback as unknown as (message: { body: string }) => void);
    this.unsubscribers.push(unsubscribe);
    return { unsubscribe };
  }

  publish({ destination, body }: { destination: string; body?: string }): void {
    const match = destination.match(/^\/app\/rooms\/(\d+)\/send$/);
    if (!match || !body || this.userId === null) return;

    const roomId = Number(match[1]);
    const payload = JSON.parse(body) as SendPayload;
    const user = store.users.get(this.userId);

    const attachments = (store.files.get(roomId) || [])
      .filter((f) => payload.attachmentFileIdsInOrder.includes(f.fileId))
      .map((f) => ({ ...f }));

    const message: ChatMessageRecord = {
      messageId: nextId("messageId"),
      roomId,
      clientMessageId: payload.clientMessageId,
      type: payload.type,
      content: payload.content,
      createdAt: new Date().toISOString(),
      sender: user
        ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl, avatarVersion: user.avatarVersion }
        : { id: this.userId, name: "나", avatarUrl: null },
      attachments,
      readBy: [this.userId],
    };

    const list = store.messages.get(roomId) || [];
    list.push(message);
    store.messages.set(roomId, list);

    const member = getMember(roomId, this.userId);
    if (member) member.lastReadMessageId = message.messageId;

    bus.publish(`/topic/rooms/${roomId}`, JSON.stringify(message));
    bus.publish(
      "/user/queue/room-events",
      JSON.stringify({
        roomId,
        unreadCount: 0,
        lastMessage: {
          id: message.messageId,
          type: message.type,
          content: message.content,
          sender: message.sender,
          createdAt: message.createdAt,
        },
      })
    );
  }
}
