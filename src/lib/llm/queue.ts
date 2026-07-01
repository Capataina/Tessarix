/**
 * A tiny client-side priority queue in front of the local LLM. The model runs
 * one request at a time (Ollama NUM_PARALLEL=1), so firing several at once — e.g.
 * every widget's state-caption on lesson load — serialises anyway AND starves
 * whatever the reader is actually interacting with. This queue makes the ordering
 * explicit: reader-initiated calls ("high" — tooltip, explain-here, chat,
 * mini-lesson) jump ahead of background auto-generation ("low" — widget state
 * captions, prewarm), and only `concurrency` run at once.
 *
 * It orders the QUEUE, not the running call — a call already in flight is not
 * pre-empted, so a "high" arrival waits at most one in-flight call rather than a
 * whole backlog. Concurrency is 1 to match the model's single slot (a higher
 * number would just re-queue server-side and lose the priority ordering).
 */
export type LLMPriority = "high" | "low";

interface QueueItem {
  run: () => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}

class LLMQueue {
  private high: QueueItem[] = [];
  private low: QueueItem[] = [];
  private active = 0;

  constructor(private readonly concurrency = 1) {}

  enqueue<T>(run: () => Promise<T>, priority: LLMPriority): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueueItem = {
        run: run as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
      };
      (priority === "high" ? this.high : this.low).push(item);
      this.pump();
    });
  }

  private pump(): void {
    while (this.active < this.concurrency) {
      const item = this.high.shift() ?? this.low.shift();
      if (!item) return;
      this.active++;
      Promise.resolve()
        .then(item.run)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }
}

const queue = new LLMQueue(1);

/** Schedule an LLM call through the shared priority queue. */
export function enqueueLLM<T>(run: () => Promise<T>, priority: LLMPriority = "low"): Promise<T> {
  return queue.enqueue(run, priority);
}
