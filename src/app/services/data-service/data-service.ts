// data-service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { BehaviorSubject, Observable, of, lastValueFrom } from 'rxjs'; 
import { tap, catchError } from 'rxjs/operators';
import Transaction from '../../models/transaction'; 
import UserData from '../../models/user-data';
import qrData from '../../models/qrData';
import { environment } from '../../../enviroments/enviroment';// <-- IMPORTADO

// --- INTERFACES ---
interface AccountSearchResult {
  idaccount: string;
  alias: string;
  cvu: string;
  user: {
    nombre: string;
    apellido: string;
    dni: string;
  };
}

interface TaxCalculationResult {
  montoOriginal: number;
  iva: number;
  precioDolar?: number;
  totalFinal: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private baseUrl = environment.apiUrl; 

  private userDataSubject = new BehaviorSubject<UserData | null>(null);
  public userData$ = this.userDataSubject.asObservable();

  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public transactions$ = this.transactionsSubject.asObservable();

  constructor(private http: HttpClient) {
    
    this.loadUserDataFromStorage(); 
  }

  // --- GESTIÓN DE DATOS DE USUARIO  ---

  /**
   * Carga los datos del usuario desde el backend o caché.
   * @param forceRefresh - Si es true, ignora caché y siempre llama al backend.
   * @returns Observable que emite los datos del usuario o null.
   */
  loadUserData(forceRefresh: boolean = false): Observable<UserData | null> {
    const accountId = localStorage.getItem('accountId');
    const jwt = localStorage.getItem('JWT'); 

    // 1. Verifica si hay sesión
    if (!accountId || !jwt) {
      console.error('>>> loadUserData: No hay sesión válida (falta accountId o JWT).');
      if (this.userDataSubject.getValue() !== null) { // Solo emite null si había datos antes
        this.userDataSubject.next(null);
        this.saveUserDataToStorage(null); // Limpia storage
      }
      return of(null); // Devuelve Observable con null
    }

    // 2. Devuelve datos actuales si no se fuerza recarga y ya existen
    const currentValue = this.userDataSubject.getValue();
    if (!forceRefresh && currentValue) {
      return of(currentValue);
    }

    // 3. Realiza la llamada HTTP con headers de no-cache
    return this.http.get<any>(`${this.baseUrl}/user/data`, {
     
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
      // El interceptor añadirá 'Authorization' además de estos
    }).pipe(
      tap(response => {
        if (response) {
          const userData: UserData = {
            name: response.name || 'Usuario',
            lastName: response.lastName || '',
            dni: response.dni || '',
            email: response.email || '',
            alias: response.alias || 'usuario.alias', 
            cvu: response.cvu || '0000000000000000000000',
            username: response.username || 'usuario', 
            balance: response.balance || 0,
            idAccount: response.idAccount?.toString() || accountId
          };
          this.userDataSubject.next(userData); // Actualiza el Subject
          this.saveUserDataToStorage(userData); // Guarda en storage
        } else {
          console.warn('>>> loadUserData: Respuesta del backend vacía.'); // LOG RESPUESTA VACÍA
          this.userDataSubject.next(null);
          this.saveUserDataToStorage(null);
        }
      }),
      catchError(error => {
        console.error('>>> loadUserData: ERROR en llamada a GET /user/data:', error); // LOG ERROR HTTP
        this.userDataSubject.next(null);
        this.saveUserDataToStorage(null); // Limpia storage en caso de error
        return of(null); // Devuelve null para no romper suscripciones
      })
    );
  } // Fin de loadUserData // Fin de loadUserData

  /**
   * Carga datos desde localStorage al inicio o como fallback.
   * Actualiza el Subject si encuentra datos válidos y el Subject está vacío.
   */
  private loadUserDataFromStorage(): void {
    try {
      const storedData = localStorage.getItem('userData'); 
      if (storedData) {
        const userData = JSON.parse(storedData) as UserData;
        // V--- LOG PARA VER QUÉ CARGA ---V
        if (!this.userDataSubject.getValue()) { // Solo actualiza si el Subject está vacío
            this.userDataSubject.next(userData);
        }
    }
      }  catch (error) {
      console.error('>>> loadUserDataFromStorage: ERROR al parsear datos de localStorage:', error); // LOG LOAD STORAGE ERROR
      localStorage.removeItem('userData');
      if (this.userDataSubject.getValue() !== null) {
         this.userDataSubject.next(null);
      }
    }
  }

  /**
   * Guarda los datos del usuario en localStorage o los elimina si es null.
   */
  private saveUserDataToStorage(userData: UserData | null): void { // Acepta null
   
    try {
      if (userData) {
        localStorage.setItem('userData', JSON.stringify(userData));
      
       
      } else {
        localStorage.removeItem('userData');
       
      }
    } catch (error) {
      console.error('>>> saveUserDataToStorage: ERROR al guardar/eliminar:', error); // LOG SAVE ERROR
   }
  }

  // --- OBTENER DATOS ACTUALES ---
  getCurrentUserData(): UserData | null {
    return this.userDataSubject.getValue();
  }

  // --- MÉTODOS DE ACTUALIZACIÓN ---
   async updateAlias(newAlias: string): Promise<void> {
  const accountId = localStorage.getItem('accountId');
  if (!accountId) throw new Error('No hay sesión activa');
  try {
    
    await lastValueFrom( this.http.put(`${this.baseUrl}/accounts/${accountId}/changeAlias`, { newAlias: newAlias }) );
    
    this.loadUserData(true).subscribe();
  } catch (error) { console.error('Error updating alias:', error); throw error; }
}

  async updateUsername(newUsername: string): Promise<any> {
     if (!localStorage.getItem('JWT')) throw new Error('No hay sesión activa');
    try {
      const response = await lastValueFrom( this.http.put(`${this.baseUrl}/auth/changeUsername`, { newUsername: newUsername }) );
      this.loadUserData(true).subscribe();
      return response;
    } catch (error) { console.error('Error updating username:', error); throw error; }
  }

  async ingresarDinero(balance: number): Promise<any> {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) throw new Error('No hay sesión activa');
    try {
      const response = await lastValueFrom( this.http.put(`${this.baseUrl}/accounts/${accountId}/balance`, { balance: balance }) );
      this.loadUserData(true).subscribe();
      return response;
    } catch (error) {
      console.error('Error ingresando dinero:', error);
      this.loadUserData(true).subscribe(); // Intenta refrescar igual
      throw error;
    }
  }

  async realizarTransferencia(idDestino: string, monto: number): Promise<any> {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) throw new Error('No hay sesión activa');
    try {
      const response = await lastValueFrom( this.http.post(`${this.baseUrl}/transactions/${accountId}/transfer/${idDestino}`, { balance: monto }) );
      this.loadUserData(true).subscribe(); // Refresca datos de usuario
      this.loadTransactions().catch(err => console.error("Error recargando tx después de transferir:", err)); // Refresca transacciones
      return response;
    } catch (error) {
      console.error('Error realizando transferencia:', error);
      this.loadUserData(true).subscribe(); // Intenta refrescar igual
      this.loadTransactions().catch(err => console.error("Error recargando tx después de transferir (fallida):", err));
      throw error;
    }
  }

  // --- MÉTODOS DE LECTURA ---

  async loadTransactions(): Promise<Transaction[]> {
     const accountId = localStorage.getItem('accountId');
     if (!accountId) {
       this.transactionsSubject.next([]); // Limpia si no hay sesión
       return []; // Devuelve array vacío si no hay sesión
     }

    try {
      const response = await lastValueFrom(
        this.http.get<any[]>(`${this.baseUrl}/transactions/${accountId}/getTransactions`)
      );

      if (!response || !Array.isArray(response)) {
        this.transactionsSubject.next([]);
        return [];
      }

      const transactions: Transaction[] = response.map((tx: any) => {
         const currentAccountIdNum = parseInt(accountId, 10); // Convertir a número para comparación segura
         const isIncoming = tx.idOrigin !== currentAccountIdNum;

         return {
           id: tx.idTransaction,
           type: isIncoming ? 'income' : 'expense',
           description: isIncoming ?
             `Transferencia de ${tx.originAlias || tx.originUsername || 'Desconocido'}` :
             `Transferencia a ${tx.destinationAlias || tx.destinationUsername || 'Desconocido'}`,
           amount: parseFloat(tx.amount) || 0,
           date: tx.date ? new Date(tx.date) : new Date(),
           from: tx.originAlias || tx.originUsername,
           to: tx.destinationAlias || tx.destinationUsername,
           originId: tx.idOrigin,
           destinationId: tx.idDestination,
           status: tx.state || 'COMPLETED'
         };
      });

      this.transactionsSubject.next(transactions);
      return transactions;

    } catch (error) {
      console.error('Error en loadTransactions:', error);
      this.transactionsSubject.next([]); // Emite array vacío en error
      throw error;
    }
  }

  getCurrentTransactions(): Transaction[] {
    return this.transactionsSubject.value;
  }

  getMyQrData(accountId: number): Observable<qrData> {
      return this.http.get<qrData>(`${this.baseUrl}/accounts/${accountId}/qr-data`);
  }

  async calculateTaxesARS(amount: number): Promise<TaxCalculationResult> {
    try {
      const response = await lastValueFrom(this.http.get<any>(`${this.baseUrl}/impuestos/calculateARS?montoARS=${amount}`));
       if (!response) throw new Error('No se recibió respuesta');
       return { montoOriginal: response.montoOriginal, iva: response.iva, totalFinal: response.totalFinal };
    } catch (error) { console.error('Error calculando impuestos ARS:', error); throw error; }
  }



  async calculateTaxesUSD(amount: number): Promise<TaxCalculationResult> {
     try {
       const response = await lastValueFrom(this.http.get<any>(`${this.baseUrl}/impuestos/calculateUSD?montoUSD=${amount}`));
        if (!response) throw new Error('No se recibió respuesta');
        return { montoOriginal: response.montoOriginal, iva: response.iva, precioDolar: response.precioDolar, totalFinal: response.totalFinal };
   } catch (error) { console.error('Error calculando impuestos USD:', error); throw error; }
  }

  

  async buscarCuenta(input: string): Promise<AccountSearchResult> {
     if (!localStorage.getItem('JWT')) throw new Error('No hay sesión activa');
    try {
      const response = await lastValueFrom(this.http.get<AccountSearchResult>(`${this.baseUrl}/transactions/search/${encodeURIComponent(input)}`));
      if (!response) throw new Error('Cuenta no encontrada');
      return response;
    } catch (error: any) {
      console.error('Error buscando cuenta:', error);
      if (error.status === 404) throw new Error('Cuenta no encontrada');
      if (error.status === 401) throw new Error('Sesión expirada');
      throw new Error('Error al buscar la cuenta');
    }
  }

  async checkSession(): Promise<boolean> {
     const jwt = localStorage.getItem('JWT');
     if (!jwt) return false;
    try {
      const response = await lastValueFrom(this.http.get<any>(`${this.baseUrl}/auth/check-session`)) as any;
      return response?.status === 'ACTIVE';
    } catch (error) { console.error('Error verificando sesión:', error); return false; }
  }






  async getFavoriteContacts(): Promise<any[]> {
     if (!localStorage.getItem('JWT')) throw new Error('No hay token');
     try {
       const response = await lastValueFrom(
         this.http.get<any>(`${this.baseUrl}/favorites/list`)
       );
       return response?.favorites || [];
     } catch (error) {
       console.error('Error obteniendo favoritos:', error);
      throw error;
     }
  }



  async getFavoriteContactsOrderedByUsage(): Promise<any[]> {
     if (!localStorage.getItem('JWT')) throw new Error('No hay token');
     try {
       const response = await lastValueFrom(
         this.http.get<any>(`${this.baseUrl}/favorites/list/recent`)
       );
       return response?.favorites || [];
     } catch (error) {
       console.error('Error obteniendo favoritos ordenados:', error);
       throw error;
     }
  }



  async addFavoriteContact(accountId: number, contactAlias: string, description?: string): Promise<boolean> {
     if (!localStorage.getItem('JWT')) throw new Error('No hay token');
     try {
       const body = { accountId, contactAlias, description: description || '' };
       const response = await lastValueFrom(
         this.http.post<any>(`${this.baseUrl}/favorites/add`, body)
       );
       return response?.status === 'SUCCESS';
     } catch (error) {
       console.error('Error agregando favorito:', error);
       throw error;
     }
  }



  async updateFavoriteContact(contactId: number, contactAlias?: string, description?: string): Promise<boolean> {
     if (!localStorage.getItem('JWT')) throw new Error('No hay token');
     try {
       const body: any = {};
       if (contactAlias) body.contactAlias = contactAlias;
       if (description !== undefined) body.description = description;
       const response = await lastValueFrom(
         this.http.put<any>(`${this.baseUrl}/favorites/update/${contactId}`, body)
       );
       return response?.status === 'SUCCESS';
     } catch (error) {
       console.error('Error actualizando favorito:', error);
       throw error;
     }
  }

  async removeFavoriteContact(favoriteId: number): Promise<boolean> {
     if (!localStorage.getItem('JWT')) throw new Error('No hay token');
     try {
       const response = await lastValueFrom(
         this.http.delete<any>(`${this.baseUrl}/favorites/${favoriteId}`)
       );
       return response?.status === 'SUCCESS';
     } catch (error) {
       console.error('Error eliminando favorito:', error);
       throw error;
     }
  }

}