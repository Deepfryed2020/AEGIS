export class WorkerPool {
  private concurrency: number;
  private active = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  enqueue(task: () => Promise<void>): void {
    this.queue.push(task);
    this.drain();
  }

  private drain(): void {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.active += 1;
      task()
        .catch((error) => console.error('[worker-pool] task failed:', error))
        .finally(() => {
          this.active -= 1;
          this.drain();
        });
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  get running(): number {
    return this.active;
  }
}

export const ingestionWorkerPool = new WorkerPool(3);
