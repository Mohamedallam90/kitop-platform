/**
 * Cancellation utilities for handling request cancellation
 */

export class CancellationToken {
  private _isCancelled = false;
  private _callbacks: (() => void)[] = [];
  private _abortController = new AbortController();

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  get abortSignal(): AbortSignal {
    return this._abortController.signal;
  }

  cancel(): void {
    if (this._isCancelled) return;
    
    this._isCancelled = true;
    this._abortController.abort();
    this._callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cancellation callback:', error);
      }
    });
    this._callbacks = [];
  }

  onCancelled(callback: () => void): void {
    if (this._isCancelled) {
      callback();
    } else {
      this._callbacks.push(callback);
    }
  }

  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new CancellationError('Operation was cancelled');
    }
  }
}

export class CancellationError extends Error {
  constructor(message: string = 'Operation was cancelled') {
    super(message);
    this.name = 'CancellationError';
  }
}

/**
 * Creates a timeout-based cancellation token
 */
export function createTimeoutToken(timeoutMs: number): CancellationToken {
  const token = new CancellationToken();
  
  setTimeout(() => {
    token.cancel();
  }, timeoutMs);
  
  return token;
}

/**
 * Combines multiple cancellation tokens into one
 */
export function combineCancellationTokens(...tokens: CancellationToken[]): CancellationToken {
  const combinedToken = new CancellationToken();
  
  tokens.forEach(token => {
    token.onCancelled(() => {
      combinedToken.cancel();
    });
  });
  
  return combinedToken;
}