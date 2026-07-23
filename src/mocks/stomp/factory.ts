import { Client, type StompConfig, type IMessage } from "@stomp/stompjs";
import { FakeStompClient } from "./fakeClient";
import { isMockingEnabled } from "../env";

export interface IStompClient {
  onConnect?: () => void;
  onStompError?: (frame: { headers: Record<string, string> }) => void;
  onWebSocketClose?: (event?: CloseEvent) => void;
  onWebSocketError?: (event?: Event) => void;
  connected: boolean;
  activate(): void;
  deactivate(): void;
  subscribe(destination: string, callback: (message: IMessage) => void): { unsubscribe(): void };
  publish(params: { destination: string; body?: string }): void;
}

export function createStompClient(config: StompConfig): IStompClient {
  if (isMockingEnabled) {
    return new FakeStompClient(config);
  }
  return new Client(config) as unknown as IStompClient;
}
