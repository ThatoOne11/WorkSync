export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DownstreamSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownstreamSyncError';
  }
}
