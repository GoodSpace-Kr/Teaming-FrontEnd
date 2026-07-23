import { useEffect, useRef, useState, useCallback } from "react";
import type { IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { createStompClient, type IStompClient } from "@/mocks/stomp/factory";

interface RoomSuccessEvent {
  roomId: number;
}

interface MessageAttachment {
  fileId: number;
  uploaderId: number;
  sortOrder: number;
  name: string;
  type: "IMAGE" | "FILE" | "VIDEO" | "AUDIO";
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  downloadUrl: string | null;
  antiVirusScanStatus: "PENDING" | "PASSED" | "FAILED" | "INFECTED";
  transcodeStatus: "NONE" | "PENDING" | "COMPLETED" | "FAILED";
  ready: boolean;
}

interface SenderSummary {
  id: number | null;
  name: string;
  avatarUrl: string | null;
}

interface ChatMessage {
  messageId: number;
  roomId: number;
  clientMessageId: string;
  type: "TEXT" | "IMAGE" | "FILE" | "VIDEO" | "AUDIO" | "SYSTEM_NOTICE";
  content: string | null;
  createdAt: string;
  sender: SenderSummary;
  attachments: MessageAttachment[];
}

interface ReadBoundaryUpdate {
  roomId: number;
  userId: number;
  lastReadMessageId: number | null;
  unreadCount: number;
}

interface LastMessagePreview {
  id: number;
  type: "TEXT" | "IMAGE" | "FILE" | "VIDEO" | "AUDIO" | "SYSTEM_NOTICE";
  content: string | null;
  sender: SenderSummary;
  createdAt: string;
}

interface UserRoomEvent {
  roomId: number;
  unreadCount: number;
  lastMessage: LastMessagePreview | null;
}

// ✅ 서버 응답 형식에 맞게 수정
interface RoomMemberResponseDto {
  memberId: number;
  lastReadMessageId: number | null;
  name: string;
  avatarUrl: string | null;
  avatarVersion: number | null;
  roomRole: "LEADER" | string;
}

interface UseWebSocketProps {
  roomId: string;
  token: string;
  onMessageReceived: (message: ChatMessage) => void;
  onReadBoundaryUpdate?: (update: ReadBoundaryUpdate) => void;
  onRoomEvent?: (event: UserRoomEvent) => void;
  onMemberEntered?: (member: RoomMemberResponseDto) => void; // ✅ 타입 변경
  onRoomSuccess?: (event: RoomSuccessEvent) => void;
  onError?: (error: string) => void;
}

export const useWebSocket = ({
  roomId,
  token,
  onMessageReceived,
  onReadBoundaryUpdate,
  onRoomEvent,
  onMemberEntered,
  onRoomSuccess,
  onError,
}: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const clientRef = useRef<IStompClient | null>(null);

  const callbacksRef = useRef({
    onMessageReceived,
    onReadBoundaryUpdate,
    onRoomEvent,
    onMemberEntered,
    onRoomSuccess,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMessageReceived,
      onReadBoundaryUpdate,
      onRoomEvent,
      onMemberEntered,
      onRoomSuccess,
      onError,
    };
  }, [onMessageReceived, onReadBoundaryUpdate, onRoomEvent, onMemberEntered, onRoomSuccess, onError]);

  const connect = useCallback(() => {
    if (clientRef.current?.connected) return;

    setIsConnecting(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://13.125.193.243:8080";
    const wsUrl = `${backendUrl}/ws-sockjs?token=${encodeURIComponent(token)}`;

    console.log("WebSocket 연결 시도:", wsUrl);

    const client = createStompClient({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 0,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log("WebSocket Connected");
      setIsConnected(true);
      setIsConnecting(false);

      // 1. 채팅방 메시지 구독
      client.subscribe(`/topic/rooms/${roomId}`, (message: IMessage) => {
        try {
          const chatMessage: ChatMessage = JSON.parse(message.body);
          console.log("메시지 수신:", chatMessage);
          callbacksRef.current.onMessageReceived(chatMessage);
        } catch (error) {
          console.error("메시지 파싱 오류:", error);
        }
      });

      // 2. 읽음 경계 업데이트 구독
      client.subscribe(`/topic/rooms/${roomId}/read`, (message: IMessage) => {
        try {
          const update: ReadBoundaryUpdate = JSON.parse(message.body);
          console.log("읽음 경계 업데이트:", update);
          if (callbacksRef.current.onReadBoundaryUpdate) {
            callbacksRef.current.onReadBoundaryUpdate(update);
          }
        } catch (error) {
          console.error("읽음 업데이트 파싱 오류:", error);
        }
      });

      // 3. 멤버 입장 이벤트 구독 - ✅ 수정됨
      client.subscribe(`/topic/rooms/${roomId}/enter`, (message: IMessage) => {
        try {
          const member: RoomMemberResponseDto = JSON.parse(message.body);
          console.log("멤버 입장 이벤트:", member);
          if (callbacksRef.current.onMemberEntered) {
            callbacksRef.current.onMemberEntered(member);
          }
        } catch (error) {
          console.error("멤버 입장 이벤트 파싱 오류:", error);
        }
      });

      // 4. 팀플 성공 이벤트 구독
      client.subscribe(`/topic/rooms/${roomId}/success`, (message: IMessage) => {
        try {
          const event: RoomSuccessEvent = JSON.parse(message.body);
          console.log("팀플 성공 이벤트:", event);
          if (callbacksRef.current.onRoomSuccess) {
            callbacksRef.current.onRoomSuccess(event);
          }
        } catch (error) {
          console.error("팀플 성공 이벤트 파싱 오류:", error);
        }
      });

      // 5. 에러 메시지 구독
      client.subscribe("/user/queue/errors", (message: IMessage) => {
        console.error("WebSocket Error:", message.body);
        try {
          const errorData = JSON.parse(message.body);
          if (callbacksRef.current.onError) {
            callbacksRef.current.onError(errorData.message || "알 수 없는 오류");
          }
        } catch {
          if (callbacksRef.current.onError) {
            callbacksRef.current.onError(message.body);
          }
        }
      });

      // 6. 개인 방 이벤트 구독
      client.subscribe("/user/queue/room-events", (message: IMessage) => {
        try {
          const event: UserRoomEvent = JSON.parse(message.body);
          console.log("방 이벤트:", event);
          if (callbacksRef.current.onRoomEvent) {
            callbacksRef.current.onRoomEvent(event);
          }
        } catch (error) {
          console.error("방 이벤트 파싱 오류:", error);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error("STOMP Error:", frame.headers["message"]);
      setIsConnected(false);
      setIsConnecting(false);

      if (callbacksRef.current.onError) {
        callbacksRef.current.onError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }

      client.deactivate();
    };

    client.onWebSocketClose = (event) => {
      console.log("WebSocket Disconnected");
      if (event) {
        console.log("종료 코드:", event.code);
        console.log("종료 이유:", event.reason);
      }
      setIsConnected(false);
      setIsConnecting(false);
    };

    client.onWebSocketError = (error) => {
      console.error("WebSocket Error:", error);
    };

    try {
      client.activate();
      clientRef.current = client;
    } catch (error) {
      console.error("WebSocket 활성화 실패:", error);
      setIsConnecting(false);
    }
  }, [token, roomId]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  const sendMessage = useCallback(
    (
      content: string | null,
      type: "TEXT" | "IMAGE" | "FILE" | "VIDEO" | "AUDIO" | "SYSTEM_NOTICE" = "TEXT",
      attachmentFileIds: number[] = []
    ) => {
      if (!clientRef.current?.connected) {
        console.error("WebSocket이 연결되지 않았습니다.");
        return false;
      }

      try {
        const clientMessageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const message = {
          clientMessageId,
          content,
          type,
          attachmentFileIdsInOrder: attachmentFileIds,
        };

        console.log("메시지 전송:", message);

        clientRef.current.publish({
          destination: `/app/rooms/${roomId}/send`,
          body: JSON.stringify(message),
        });

        return true;
      } catch (error) {
        console.error("메시지 전송 오류:", error);
        return false;
      }
    },
    [roomId]
  );

  useEffect(() => {
    if (token && roomId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roomId]);

  return {
    isConnected,
    isConnecting,
    sendMessage,
    connect,
    disconnect,
  };
};
