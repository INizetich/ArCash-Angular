import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import Transaction from '../../models/transaction';
import UserData from '../../models/user-data';
import qrData from '../../models/qrData';


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
  
  private baseUrl = 'http://localhost:8080/api';
  
  // Estado reactivo para los datos del usuario
  private userDataSubject = new BehaviorSubject<UserData | null>(null);
  public userData$ = this.userDataSubject.asObservable();
  
  // Estado reactivo para las transacciones
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  public transactions$ = this.transactionsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserDataFromStorage();
  }

  // --- GESTIÓN DE DATOS DE USUARIO ---

  async loadUserData(): Promise<UserData> {
    try {
      const accountId = localStorage.getItem('accountId');
      const jwt = localStorage.getItem('JWT');
      
      if (!accountId || !jwt) {
        throw new Error('No hay información de sesión válida');
      }

      const headers = {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      };

      try {
        const response = await this.http.get<any>(`${this.baseUrl}/user/data`, { 
          headers,
          withCredentials: true
        }).toPromise();
        
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
          
          this.userDataSubject.next(userData);
          this.saveUserDataToStorage(userData);
          return userData;
        }
      } catch (userDataError: any) {
        console.warn('Error obteniendo datos del usuario desde backend:', userDataError);
        
        // Fallback a datos locales
        const localData = this.loadUserDataFromStorage();
        if (localData) {
          return localData;
        }
        
        // Fallback con datos mínimos
        const fallbackData: UserData = {
          name: 'Usuario',
          lastName: '',
          dni: '',
          email: '',
          alias: 'usuario.alias',
          cvu: '0000000000000000000000',
          username: 'usuario',
          balance: 0,
          idAccount: accountId
        };
        
        this.userDataSubject.next(fallbackData);
        return fallbackData;
      }
      
      throw new Error('No se pudieron cargar los datos del usuario');
    } catch (error) {
      console.error('Error en loadUserData:', error);
      throw error;
    }
  }

  private loadUserDataFromStorage(): UserData | null {
    try {
      const storedData = localStorage.getItem('userData');
      if (storedData) {
        const userData = JSON.parse(storedData) as UserData;
        this.userDataSubject.next(userData);
        return userData;
      }
    } catch (error) {
      console.error('Error loading user data from storage:', error);
    }
    return null;
  }

  private saveUserDataToStorage(userData: UserData): void {
    try {
      localStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data to storage:', error);
    }
  }

  getCurrentUserData(): UserData | null {
    return this.userDataSubject.value;
  }

  /**
   * Actualiza el alias del usuario
   */
  async updateAlias(newAlias: string): Promise<void> {
    const jwt = localStorage.getItem('JWT');
    const accountId = localStorage.getItem('accountId');
    
    if (!jwt || !accountId) {
      throw new Error('No hay sesión activa');
    }

    try {
      await this.http.put(
        `${this.baseUrl}/accounts/${accountId}/alias`,
        { alias: newAlias },
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();
      
      // Actualizar estado local
      const currentUser = this.getCurrentUserData();
      if (currentUser) {
        const updatedUser = { ...currentUser, alias: newAlias };
        this.userDataSubject.next(updatedUser);
        this.saveUserDataToStorage(updatedUser);
      }
    } catch (error) {
      console.error('Error updating alias:', error);
      throw error;
    }
  }

  /**
   * Actualiza el nombre de usuario
   */
  async updateUsername(newUsername: string): Promise<any> {
    const jwt = localStorage.getItem('JWT');
    
    if (!jwt) {
      throw new Error('No hay sesión activa');
    }

    try {
      const response = await this.http.put(
        `${this.baseUrl}/auth/changeUsername`,
        { newUsername: newUsername },
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();

      // Actualizar los datos del usuario después del cambio
      await this.loadUserData();
      
      return response;
    } catch (error) {
      console.error('Error updating username:', error);
      throw error;
    }
  }

  // --- GESTIÓN DE TRANSACCIONES ---
  
  /**
   * Carga las transacciones recientes del usuario
   */
  async loadTransactions(): Promise<Transaction[]> {
    try {
      const accountId = localStorage.getItem('accountId');
      const jwt = localStorage.getItem('JWT');
      
      if (!accountId || !jwt) {
        throw new Error('No hay información de sesión válida');
      }

      const headers = {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      };

      try {
        const response = await this.http.get<any[]>(`${this.baseUrl}/transactions/${accountId}/getTransactions`, { 
          headers,
          withCredentials: true
        }).toPromise();
        
        if (!response || !Array.isArray(response)) {
          this.transactionsSubject.next([]);
          return [];
        }
        
        const transactions: Transaction[] = response.map((tx: any) => {
          const isIncoming = tx.idOrigin !== parseInt(accountId);
          const isOutgoing = tx.idOrigin === parseInt(accountId);
          
          return {
            id: tx.idTransaction,
            type: isIncoming ? 'income' : 'expense',
            description: isIncoming ? 
              `Transferencia de ${tx.originAlias || tx.originUsername}` : 
              `Transferencia a ${tx.destinationAlias || tx.destinationUsername}`,
            amount: parseFloat(tx.amount),
            date: new Date(tx.date),
            from: tx.originAlias || tx.originUsername,
            to: tx.destinationAlias || tx.destinationUsername,
            originId: tx.idOrigin,
            destinationId: tx.idDestination,
            status: tx.state || 'COMPLETED'
          };
        });
        
        this.transactionsSubject.next(transactions);
        return transactions;
        
      } catch (endpointError) {
        console.warn('Error obteniendo transacciones desde backend:', endpointError);
        throw new Error('No se pudieron cargar las transacciones desde el servidor');
      }
    } catch (error) {
      console.error('Error en loadTransactions:', error);
      this.transactionsSubject.next([]);
      throw error;
    }
  }

  /**
   * Obtiene las transacciones actuales
   */
  getCurrentTransactions(): Transaction[] {
    return this.transactionsSubject.value;
  }

  getMyQrData(accountId : number){
    return this.http.get<qrData>(`${this.baseUrl}/accounts/${accountId}/qr-data`)
  }

  // --- CÁLCULOS FINANCIEROS ---

  /**
   * Calcula los impuestos en ARS usando el backend
   */
  async calculateTaxesARS(amount: number): Promise<TaxCalculationResult> {
    try {
      const response = await this.http.get<any>(
        `${this.baseUrl}/impuestos/calculateARS?montoARS=${amount}`
      ).toPromise();

      if (!response) {
        throw new Error('No se recibió respuesta del servidor');
      }

      return {
        montoOriginal: response.montoOriginal,
        iva: response.iva,
        precioDolar: undefined,
        totalFinal: response.totalFinal
      };
    } catch (error) {
      console.error('Error calculando impuestos ARS:', error);
      throw new Error('Error al calcular impuestos en ARS');
    }
  }

  /**
   * Calcula los impuestos en USD usando el backend
   */
  async calculateTaxesUSD(amount: number): Promise<TaxCalculationResult> {
    try {
      const response = await this.http.get<any>(
        `${this.baseUrl}/impuestos/calculateUSD?montoUSD=${amount}`
      ).toPromise();

      if (!response) {
        throw new Error('No se recibió respuesta del servidor');
      }

      return {
        montoOriginal: response.montoOriginal,
        iva: response.iva,
        precioDolar: response.precioDolar,
        totalFinal: response.totalFinal
      };
    } catch (error) {
      console.error('Error calculando impuestos USD:', error);
      throw new Error('Error al calcular impuestos en USD');
    }
  }

  // --- NUEVOS MÉTODOS PARA BACKEND ---

  /**
   * Ingresar dinero a la cuenta
   */
  async ingresarDinero(balance: number): Promise<any> {
    const accountId = localStorage.getItem('accountId');
    const jwt = localStorage.getItem('JWT');
    
    if (!accountId || !jwt) {
      throw new Error('No hay sesión activa');
    }

    try {
      const response = await this.http.put(
        `${this.baseUrl}/accounts/${accountId}/balance`,
        { balance: balance },
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();

      // Actualizar los datos después del ingreso
      await this.loadUserData();
      
      return response;
    } catch (error) {
      console.error('Error ingresando dinero:', error);
      throw error;
    }
  }

  /**
   * Buscar cuenta por alias o CVU
   */
  async buscarCuenta(input: string): Promise<AccountSearchResult> {
    const jwt = localStorage.getItem('JWT');
    
    if (!jwt) {
      throw new Error('No hay sesión activa');
    }

    try {
      const response = await this.http.get<AccountSearchResult>(
        `${this.baseUrl}/transactions/search/${encodeURIComponent(input)}`,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();
      
      if (!response) {
        throw new Error('Cuenta no encontrada');
      }
      
      return response;
    } catch (error: any) {
      console.error('Error buscando cuenta:', error);
      if (error.status === 404) {
        throw new Error('Cuenta no encontrada');
      } else if (error.status === 401) {
        throw new Error('Sesión expirada');
      } else {
        throw new Error('Error al buscar la cuenta');
      }
    }
  }

  /**
   * Realizar transferencia entre cuentas
   */
  async realizarTransferencia(idDestino: string, monto: number): Promise<any> {
    const accountId = localStorage.getItem('accountId');
    const jwt = localStorage.getItem('JWT');
    
    if (!accountId || !jwt) {
      throw new Error('No hay sesión activa');
    }

    try {
      const response = await this.http.post(
        `${this.baseUrl}/transactions/${accountId}/transfer/${idDestino}`,
        { balance: monto },
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();

      // Actualizar los datos después de la transferencia
      await this.loadUserData();
      await this.loadTransactions();
      
      return response;
    } catch (error) {
      console.error('Error realizando transferencia:', error);
      throw error;
    }
  }

  /**
   * Verificar si la sesión está activa
   */
  async checkSession(): Promise<boolean> {
    const jwt = localStorage.getItem('JWT');
    
    if (!jwt) {
      return false;
    }

    try {
      const response = await this.http.get(
        `${this.baseUrl}/auth/check-session`,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`
          }
        }
      ).toPromise() as any;

      return response?.status === 'ACTIVE';
    } catch (error) {
      console.error('Error verificando sesión:', error);
      return false;
    }
  }

  // --- GESTIÓN DE CONTACTOS FAVORITOS ---

  async getFavoriteContacts(): Promise<any[]> {
    const jwt = localStorage.getItem('JWT');
    if (!jwt) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const response = await this.http.get<any>(`${this.baseUrl}/favorites/list`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      
      return response?.favorites || [];
    } catch (error) {
      console.error('Error obteniendo contactos favoritos:', error);
      throw error;
    }
  }

  async getFavoriteContactsOrderedByUsage(): Promise<any[]> {
    const jwt = localStorage.getItem('JWT');
    if (!jwt) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const response = await this.http.get<any>(`${this.baseUrl}/favorites/list/recent`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      return response?.favorites || [];
    } catch (error) {
      console.error('Error obteniendo contactos favoritos ordenados:', error);
      throw error;
    }
  }

  async addFavoriteContact(accountId: number, contactAlias: string, description?: string): Promise<boolean> {
    const jwt = localStorage.getItem('JWT');
    if (!jwt) {
      throw new Error('No hay token de autenticación');
    }

    try {
      try {
        await this.getFavoriteContacts();
      } catch (tokenError) {
        console.error('❌ Token inválido - la solicitud de prueba falló:', tokenError);
        throw new Error('Token de autenticación inválido');
      }

      // El backend espera Long accountId, String contactAlias, String description
      const body = {
        accountId: accountId, // Asegurar que es número
        contactAlias: contactAlias,
        description: description || ''
      };
      const headers = {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      };

      const response = await this.http.post<any>(`${this.baseUrl}/favorites/add`, body, {
        headers: headers
      }).toPromise();
      
      if (response?.status === 'SUCCESS') {
        return true;
      } else {
        // El backend retornó status ERROR o no SUCCESS
        console.error('Backend retornó error:', response);
        return false;
      }
    } catch (error: any) {
      console.error('Error agregando contacto favorito:', error);
      console.error('Detalles del error:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });

      // Imprimir más detalles si hay respuesta del servidor
      if (error.error) {
        console.error('Respuesta del servidor:', error.error);
      }

      throw error;
    }
  }

  async updateFavoriteContact(contactId: number, contactAlias?: string, description?: string): Promise<boolean> {
    const jwt = localStorage.getItem('JWT');
    if (!jwt) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const body: any = {};
      if (contactAlias) body.contactAlias = contactAlias;
      if (description !== undefined) body.description = description;

      const response = await this.http.put<any>(`${this.baseUrl}/favorites/update/${contactId}`, body, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      return response?.status === 'SUCCESS';
    } catch (error) {
      console.error('Error actualizando contacto favorito:', error);
      throw error;
    }
  }

  async removeFavoriteContact(favoriteId: number): Promise<boolean> {
    const jwt = localStorage.getItem('JWT');
    if (!jwt) {
      throw new Error('No hay token de autenticación');
    }

    try {
      const response = await this.http.delete<any>(`${this.baseUrl}/favorites/${favoriteId}`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      return response?.status === 'SUCCESS';
    } catch (error) {
      console.error('Error eliminando contacto favorito:', error);
      throw error;
    }
  }

}
