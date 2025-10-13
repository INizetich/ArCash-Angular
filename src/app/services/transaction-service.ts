import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Transaction from '../models/transaction';
import { DataService } from './data-service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  // Constantes para caché
  private readonly TRANSACTIONS_CACHE_KEY = 'arcash_transactions_cache';
  private readonly CACHE_TIMESTAMP_KEY = 'arcash_transactions_cache_timestamp';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

  private recentTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public recentTransactions$ = this.recentTransactionsSubject.asObservable();

  private allTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public allTransactions$ = this.allTransactionsSubject.asObservable();

  // Paginación
  private pageSize = 20;
  private currentPage = 0;
  private displayedTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public displayedTransactions$ = this.displayedTransactionsSubject.asObservable();

  constructor(private dataService: DataService) {
    // Suscribirse a las transacciones del DataService
    this.dataService.transactions$.subscribe(transactions => {
      this.allTransactionsSubject.next(transactions);
      this.recentTransactionsSubject.next(transactions.slice(0, 3)); // Solo las últimas 3
      this.resetPagination();
    });
  }

  // Métodos de caché
  private saveTransactionsToCache(transactions: Transaction[]): void {
    try {
      localStorage.setItem(this.TRANSACTIONS_CACHE_KEY, JSON.stringify(transactions));
      localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Transacciones guardadas en caché:', transactions.length);
    } catch (error) {
      console.warn('Error guardando transacciones en caché:', error);
    }
  }

  private getTransactionsFromCache(): Transaction[] | null {
    try {
      // Verificar si el caché es válido
      const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
      const cached = localStorage.getItem(this.TRANSACTIONS_CACHE_KEY);
      
      console.log('🔍 Verificando caché de transacciones:', {
        tieneCache: !!cached,
        tieneTimestamp: !!timestamp,
        ahora: Date.now(),
        timestamp: timestamp ? parseInt(timestamp) : null,
        diferencia: timestamp ? Date.now() - parseInt(timestamp) : null,
        duracionCache: this.CACHE_DURATION,
        esValido: timestamp ? (Date.now() - parseInt(timestamp)) < this.CACHE_DURATION : false
      });
      
      if (!timestamp || !cached) {
        console.log('❌ Caché no encontrado o incompleto');
        return null;
      }
      
      const cacheTime = parseInt(timestamp);
      const now = Date.now();
      if ((now - cacheTime) >= this.CACHE_DURATION) {
        // Cache expirado
        console.log('⏰ Caché expirado, limpiando...');
        this.clearTransactionsCache();
        return null;
      }

      // Cache válido, obtener datos
      const transactions = JSON.parse(cached);
      console.log('✅ Caché válido encontrado con', transactions.length, 'elementos');
      return transactions;
    } catch (error) {
      console.warn('Error cargando transacciones desde caché:', error);
      this.clearTransactionsCache();
    }
    return null;
  }

  private clearTransactionsCache(): void {
    localStorage.removeItem(this.TRANSACTIONS_CACHE_KEY);
    localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
    console.log('Caché de transacciones limpiado');
  }

  async loadAllTransactions(forceReload: boolean = false): Promise<void> {
    try {
      // Si no forzamos recarga, intentar usar caché
      if (!forceReload) {
        const cachedTransactions = this.getTransactionsFromCache();
        if (cachedTransactions) {
          this.allTransactionsSubject.next(cachedTransactions);
          this.recentTransactionsSubject.next(cachedTransactions.slice(0, 3));
          this.resetPagination();
          return;
        }
      }

      // Cargar desde servidor
      console.log('🌐 Cargando transacciones desde servidor...');
      await this.dataService.loadTransactions();
      
      // Guardar en caché después de cargar desde servidor
      const transactions = this.allTransactionsSubject.value;
      if (transactions.length > 0) {
        this.saveTransactionsToCache(transactions);
        console.log('💾 Transacciones guardadas en caché (' + transactions.length + ' elementos)');
      }
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      throw error;
    }
  }

  getRecentTransactions(): Transaction[] {
    return this.recentTransactionsSubject.value;
  }

  getAllTransactions(): Transaction[] {
    return this.allTransactionsSubject.value;
  }

  getDisplayedTransactions(): Transaction[] {
    return this.displayedTransactionsSubject.value;
  }

  resetPagination(): void {
    this.currentPage = 0;
    this.updateDisplayedTransactions();
  }

  loadMoreTransactions(): void {
    const allTransactions = this.allTransactionsSubject.value;
    const totalPages = Math.ceil(allTransactions.length / this.pageSize);
    
    if (this.currentPage < totalPages - 1) {
      this.currentPage++;
      const startIndex = this.currentPage * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      const newTransactions = allTransactions.slice(startIndex, endIndex);
      
      const currentDisplayed = this.displayedTransactionsSubject.value;
      this.displayedTransactionsSubject.next([...currentDisplayed, ...newTransactions]);
    }
  }

  hasMoreTransactions(): boolean {
    const allTransactions = this.allTransactionsSubject.value;
    const totalPages = Math.ceil(allTransactions.length / this.pageSize);
    return this.currentPage < totalPages - 1;
  }

  private updateDisplayedTransactions(): void {
    const allTransactions = this.allTransactionsSubject.value;
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedTransactionsSubject.next(allTransactions.slice(startIndex, endIndex));
  }

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

  // Método para invalidar caché manualmente
  invalidateCache(): void {
    this.clearTransactionsCache();
    console.log('🧹 Caché de transacciones invalidado manualmente');
  }
}
