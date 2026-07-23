type BusMessage = { body: string };
type BusCallback = (message: BusMessage) => void;

class StompBus {
  private subs = new Map<string, Set<BusCallback>>();

  subscribe(destination: string, callback: BusCallback): () => void {
    if (!this.subs.has(destination)) this.subs.set(destination, new Set());
    this.subs.get(destination)!.add(callback);
    return () => {
      this.subs.get(destination)?.delete(callback);
    };
  }

  publish(destination: string, body: string): void {
    this.subs.get(destination)?.forEach((callback) => callback({ body }));
  }
}

export const bus = new StompBus();
