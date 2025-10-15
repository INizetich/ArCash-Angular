import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Transaction from '../models/transaction';
import { DataService } from './data-service';
import { CacheService } from './cache.service';
import { CacheConfig } from '../models/cache.interface';
import { PaginationConfig } from '../models/common.interface';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  // Cache configuration
  private readonly cacheConfig: CacheConfig = {
    key: 'arcash_transactions_cache',
    expiryKey: 'arcash_transactions_cache_expiry',
    duration: 5 * 60 * 1000 // 5 minutos
  };

  private recentTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public recentTransactions$ = this.recentTransactionsSubject.asObservable();

  private allTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public allTransactions$ = this.allTransactionsSubject.asObservable();

  // Paginación optimizada
  private pagination: PaginationConfig = {
    page: 0,
    size: 20,
    totalPages: 0,
    hasMore: false
  };
  
  private displayedTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public displayedTransactions$ = this.displayedTransactionsSubject.asObservable();

  constructor(
    private dataService: DataService,
    private cacheService: CacheService
  ) {
    this.initializeSubscriptions();
  }

  private initializeSubscriptions(): void {
    this.dataService.transactions$.subscribe(transactions => {
      this.allTransactionsSubject.next(transactions);
      this.recentTransactionsSubject.next(transactions.slice(0, 3));
      this.resetPagination();
    });
  }

  async loadAllTransactions(forceReload: boolean = false): Promise<void> {
    try {
      if (!forceReload) {
        const cachedTransactions = this.cacheService.getCache<Transaction[]>(this.cacheConfig);
        if (cachedTransactions) {
          this.allTransactionsSubject.next(cachedTransactions);
          this.recentTransactionsSubject.next(cachedTransactions.slice(0, 3));
          this.resetPagination();
          return;
        }
      }
      await this.dataService.loadTransactions();
      
      const transactions = this.allTransactionsSubject.value;
      if (transactions.length > 0) {
        this.cacheService.setCache(this.cacheConfig, transactions);
      }
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      throw error;
    }
  }

  // Métodos de acceso a datos
  getRecentTransactions(): Transaction[] {
    return this.recentTransactionsSubject.value;
  }

  getAllTransactions(): Transaction[] {
    return this.allTransactionsSubject.value;
  }

  getDisplayedTransactions(): Transaction[] {
    return this.displayedTransactionsSubject.value;
  }

  // Paginación optimizada
  resetPagination(): void {
    this.pagination.page = 0;
    this.updatePagination();
    this.updateDisplayedTransactions();
  }

  loadMoreTransactions(): void {
    const allTransactions = this.allTransactionsSubject.value;
    this.updatePagination();
    
    if (this.pagination.hasMore) {
      this.pagination.page++;
      const startIndex = this.pagination.page * this.pagination.size;
      const endIndex = startIndex + this.pagination.size;
      const newTransactions = allTransactions.slice(startIndex, endIndex);
      
      const currentDisplayed = this.displayedTransactionsSubject.value;
      this.displayedTransactionsSubject.next([...currentDisplayed, ...newTransactions]);
      this.updatePagination();
    }
  }

  hasMoreTransactions(): boolean {
    return this.pagination.hasMore;
  }

  private updatePagination(): void {
    const allTransactions = this.allTransactionsSubject.value;
    this.pagination.totalPages = Math.ceil(allTransactions.length / this.pagination.size);
    this.pagination.hasMore = this.pagination.page < this.pagination.totalPages - 1;
  }

  private updateDisplayedTransactions(): void {
    const allTransactions = this.allTransactionsSubject.value;
    const startIndex = this.pagination.page * this.pagination.size;
    const endIndex = startIndex + this.pagination.size;
    this.displayedTransactionsSubject.next(allTransactions.slice(startIndex, endIndex));
  }

  // Métodos de formateo
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(date));
  }

  formatDateDetailed(date: Date): string {
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    const timeStr = dateObj.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return `${dateStr} a las ${timeStr}`;
  }

  getTransactionClass(transaction: Transaction): string {
    if (transaction.status === 'FAILED') return 'monto fallida';
    return transaction.type === 'income' ? 'monto positivo' : 'monto negativo';
  }

  // Cache management
  invalidateCache(): void {
    this.cacheService.clearCache(this.cacheConfig);
  }
}
