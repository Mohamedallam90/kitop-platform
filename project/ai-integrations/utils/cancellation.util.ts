/**
 * Cancellation utilities for handling request cancellation
 */

export class CancellationToken {
  private _isCancelled = false;
  private _callbacks: (() => void)[] = [];

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  cancel(): void {
    if (this._isCancelled) return;
    
    this._isCancelled = true;
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
 * Creates an AbortController that's linked to a CancellationToken
 */
export function createAbortController(token?: CancellationToken): AbortController {
  const controller = new AbortController();
  
  if (token) {
    token.onCancelled(() => {
      controller.abort();
    });
  }
  
  return controller;
}

/**
 * Wraps a promise with cancellation support
 */
export function cancellablePromise<T>(
  promise: Promise<T>,
  token?: CancellationToken
): Promise<T> {
  if (!token) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    // Check if already cancelled
    if (token.isCancelled) {
      reject(new CancellationError());
      return;
    }

    // Set up cancellation handler
    token.onCancelled(() => {
      reject(new CancellationError());
    });

    // Handle promise resolution
    promise
      .then(result => {
        if (!token.isCancelled) {
          resolve(result);
        }
      })
      .catch(error => {
        if (!token.isCancelled) {
          reject(error);
        }
      });
  });
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