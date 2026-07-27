export interface JobQueue {
  enqueue<TPayload>(jobType: string, payload: TPayload): Promise<void>;
}
