type RequirementFn<T> = (item: T) => boolean;

export class SchedulePriorityQueue<T> {
  private heap: T[] = []; //Apply max-heap on priority
  private priorityFn: (a: T, b: T) => number;

  constructor(priorityFn: (a: T, b: T) => number) {
    this.priorityFn = priorityFn;
  }

  enqueue(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    this.swap(0, this.heap.length - 1);
    const item = this.heap.pop();
    this.bubbleDown(0);
    return item;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  next(requirementFn: RequirementFn<T>): T | undefined {
    for (let i = 0; i < this.heap.length; i++) {
      if (requirementFn(this.heap[i])) {
        const nextItem = this.heap[i];
        this.removeAt(i);
        return nextItem;
      }
    }
    return undefined;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.priorityFn(this.heap[index], this.heap[parentIndex]) <= 0) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let leftIndex = 2 * index + 1;
      let rightIndex = 2 * index + 2;
      let smallest = index;

      if (leftIndex < length && this.priorityFn(this.heap[leftIndex], this.heap[smallest]) < 0) {
        smallest = leftIndex;
      }

      if (rightIndex < length && this.priorityFn(this.heap[rightIndex], this.heap[smallest]) < 0) {
        smallest = rightIndex;
      }

      if (smallest === index) break;

      this.swap(index, smallest);
      index = smallest;
    }
  }

  private removeAt(index: number): void {
    if (index >= this.heap.length) return;
    if (index === this.heap.length - 1) {
      this.heap.pop();
      return;
    }
    this.swap(index, this.heap.length - 1);
    this.heap.pop();
    this.bubbleDown(index);
    this.bubbleUp(index);
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}
