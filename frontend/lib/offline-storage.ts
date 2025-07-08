/**
 * Offline Storage Service using IndexedDB
 * Handles local storage of proposals, contracts, and drafts for offline functionality
 */

export interface OfflineProposal {
  id: string;
  title: string;
  content: string;
  clientEmail: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
  metadata?: Record<string, any>;
}

export interface OfflineContract {
  id: string;
  proposalId: string;
  content: string;
  parties: string[];
  terms: Record<string, any>;
  status: 'draft' | 'review' | 'signed' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
  comments?: OfflineComment[];
}

export interface OfflineComment {
  id: string;
  documentId: string;
  clauseId: string;
  content: string;
  author: string;
  createdAt: Date;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
}

class OfflineStorageService {
  private dbName = 'kitops-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create proposals store
        if (!db.objectStoreNames.contains('proposals')) {
          const proposalStore = db.createObjectStore('proposals', { keyPath: 'id' });
          proposalStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          proposalStore.createIndex('status', 'status', { unique: false });
          proposalStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create contracts store
        if (!db.objectStoreNames.contains('contracts')) {
          const contractStore = db.createObjectStore('contracts', { keyPath: 'id' });
          contractStore.createIndex('proposalId', 'proposalId', { unique: false });
          contractStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          contractStore.createIndex('status', 'status', { unique: false });
        }

        // Create comments store
        if (!db.objectStoreNames.contains('comments')) {
          const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
          commentStore.createIndex('documentId', 'documentId', { unique: false });
          commentStore.createIndex('clauseId', 'clauseId', { unique: false });
          commentStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('priority', 'priority', { unique: false });
        }
      };
    });
  }

  /**
   * Store proposal offline
   */
  async storeProposal(proposal: OfflineProposal): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['proposals'], 'readwrite');
      const store = transaction.objectStore('proposals');
      
      const proposalData = {
        ...proposal,
        isOffline: true,
        syncStatus: 'pending' as const,
        updatedAt: new Date()
      };

      const request = store.put(proposalData);

      request.onsuccess = () => {
        this.addToSyncQueue('proposal', proposal.id, 'create');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to store proposal'));
      };
    });
  }

  /**
   * Store contract offline
   */
  async storeContract(contract: OfflineContract): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['contracts'], 'readwrite');
      const store = transaction.objectStore('contracts');
      
      const contractData = {
        ...contract,
        isOffline: true,
        syncStatus: 'pending' as const,
        updatedAt: new Date()
      };

      const request = store.put(contractData);

      request.onsuccess = () => {
        this.addToSyncQueue('contract', contract.id, 'create');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to store contract'));
      };
    });
  }

  /**
   * Store comment offline
   */
  async storeComment(comment: OfflineComment): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['comments'], 'readwrite');
      const store = transaction.objectStore('comments');
      
      const commentData = {
        ...comment,
        isOffline: true,
        syncStatus: 'pending' as const,
        createdAt: new Date()
      };

      const request = store.put(commentData);

      request.onsuccess = () => {
        this.addToSyncQueue('comment', comment.id, 'create');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to store comment'));
      };
    });
  }

  /**
   * Get all proposals from offline storage
   */
  async getProposals(): Promise<OfflineProposal[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['proposals'], 'readonly');
      const store = transaction.objectStore('proposals');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get proposals'));
      };
    });
  }

  /**
   * Get all contracts from offline storage
   */
  async getContracts(): Promise<OfflineContract[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['contracts'], 'readonly');
      const store = transaction.objectStore('contracts');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get contracts'));
      };
    });
  }

  /**
   * Get comments for a specific document
   */
  async getComments(documentId: string): Promise<OfflineComment[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['comments'], 'readonly');
      const store = transaction.objectStore('comments');
      const index = store.index('documentId');
      const request = index.getAll(documentId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get comments'));
      };
    });
  }

  /**
   * Add item to sync queue
   */
  private async addToSyncQueue(type: string, itemId: string, action: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    const syncItem = {
      id: `${type}-${itemId}-${Date.now()}`,
      type,
      itemId,
      action,
      priority: 1,
      createdAt: new Date(),
      retryCount: 0
    };

    store.add(syncItem);
  }

  /**
   * Sync all pending items with server
   */
  async syncWithServer(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync');
      return;
    }

    try {
      await this.syncProposals();
      await this.syncContracts();
      await this.syncComments();
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync proposals with server
   */
  private async syncProposals(): Promise<void> {
    const proposals = await this.getProposals();
    const pendingProposals = proposals.filter(p => p.syncStatus === 'pending');

    for (const proposal of pendingProposals) {
      try {
        const response = await fetch('/api/proposals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            title: proposal.title,
            content: proposal.content,
            clientEmail: proposal.clientEmail,
            status: proposal.status,
            metadata: proposal.metadata
          })
        });

        if (response.ok) {
          await this.updateProposalSyncStatus(proposal.id, 'synced');
        } else {
          await this.updateProposalSyncStatus(proposal.id, 'error');
        }
      } catch (error) {
        console.error(`Failed to sync proposal ${proposal.id}:`, error);
        await this.updateProposalSyncStatus(proposal.id, 'error');
      }
    }
  }

  /**
   * Sync contracts with server
   */
  private async syncContracts(): Promise<void> {
    const contracts = await this.getContracts();
    const pendingContracts = contracts.filter(c => c.syncStatus === 'pending');

    for (const contract of pendingContracts) {
      try {
        const response = await fetch('/api/contracts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            proposalId: contract.proposalId,
            content: contract.content,
            parties: contract.parties,
            terms: contract.terms,
            status: contract.status
          })
        });

        if (response.ok) {
          await this.updateContractSyncStatus(contract.id, 'synced');
        } else {
          await this.updateContractSyncStatus(contract.id, 'error');
        }
      } catch (error) {
        console.error(`Failed to sync contract ${contract.id}:`, error);
        await this.updateContractSyncStatus(contract.id, 'error');
      }
    }
  }

  /**
   * Sync comments with server
   */
  private async syncComments(): Promise<void> {
    const comments = await this.getAllComments();
    const pendingComments = comments.filter(c => c.syncStatus === 'pending');

    for (const comment of pendingComments) {
      try {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            documentId: comment.documentId,
            clauseId: comment.clauseId,
            content: comment.content,
            author: comment.author
          })
        });

        if (response.ok) {
          await this.updateCommentSyncStatus(comment.id, 'synced');
        } else {
          await this.updateCommentSyncStatus(comment.id, 'error');
        }
      } catch (error) {
        console.error(`Failed to sync comment ${comment.id}:`, error);
        await this.updateCommentSyncStatus(comment.id, 'error');
      }
    }
  }

  /**
   * Get all comments from storage
   */
  private async getAllComments(): Promise<OfflineComment[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['comments'], 'readonly');
      const store = transaction.objectStore('comments');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get all comments'));
      };
    });
  }

  /**
   * Update proposal sync status
   */
  private async updateProposalSyncStatus(id: string, status: 'pending' | 'synced' | 'error'): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['proposals'], 'readwrite');
    const store = transaction.objectStore('proposals');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const proposal = getRequest.result;
      if (proposal) {
        proposal.syncStatus = status;
        store.put(proposal);
      }
    };
  }

  /**
   * Update contract sync status
   */
  private async updateContractSyncStatus(id: string, status: 'pending' | 'synced' | 'error'): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['contracts'], 'readwrite');
    const store = transaction.objectStore('contracts');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const contract = getRequest.result;
      if (contract) {
        contract.syncStatus = status;
        store.put(contract);
      }
    };
  }

  /**
   * Update comment sync status
   */
  private async updateCommentSyncStatus(id: string, status: 'pending' | 'synced' | 'error'): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['comments'], 'readwrite');
    const store = transaction.objectStore('comments');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const comment = getRequest.result;
      if (comment) {
        comment.syncStatus = status;
        store.put(comment);
      }
    };
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['proposals', 'contracts', 'comments', 'syncQueue'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve) => {
        const request = transaction.objectStore('proposals').clear();
        request.onsuccess = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const request = transaction.objectStore('contracts').clear();
        request.onsuccess = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const request = transaction.objectStore('comments').clear();
        request.onsuccess = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const request = transaction.objectStore('syncQueue').clear();
        request.onsuccess = () => resolve();
      })
    ]);
  }

  /**
   * Check if device is online and trigger sync
   */
  setupAutoSync(): void {
    // Listen for online events
    window.addEventListener('online', () => {
      console.log('Device came online, triggering sync...');
      this.syncWithServer().catch(console.error);
    });

    // Periodic sync when online
    setInterval(() => {
      if (navigator.onLine) {
        this.syncWithServer().catch(console.error);
      }
    }, 300000); // Sync every 5 minutes
  }

  /**
   * Get sync status summary
   */
  async getSyncStatus(): Promise<{
    proposals: { pending: number; synced: number; error: number };
    contracts: { pending: number; synced: number; error: number };
    comments: { pending: number; synced: number; error: number };
  }> {
    const [proposals, contracts, comments] = await Promise.all([
      this.getProposals(),
      this.getContracts(),
      this.getAllComments()
    ]);

    const countByStatus = (items: any[]) => ({
      pending: items.filter(item => item.syncStatus === 'pending').length,
      synced: items.filter(item => item.syncStatus === 'synced').length,
      error: items.filter(item => item.syncStatus === 'error').length
    });

    return {
      proposals: countByStatus(proposals),
      contracts: countByStatus(contracts),
      comments: countByStatus(comments)
    };
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorageService();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  offlineStorage.init().then(() => {
    offlineStorage.setupAutoSync();
    console.log('Offline storage initialized');
  }).catch((error) => {
    console.error('Failed to initialize offline storage:', error);
  });
}

export default offlineStorage;