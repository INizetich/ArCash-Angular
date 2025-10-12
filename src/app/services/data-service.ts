import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import Transaction from '../models/transaction';
import UserData from '../models/user-data';

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
  percepcionGanancias?: number;
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
      console.log('🔄 DataService: Cargando datos del usuario...');
      
      const accountId = localStorage.getItem('accountId');
      const jwt = localStorage.getItem('JWT'); // ✅ Corregido: usar 'JWT' como está en localStorage
      
      console.log('🔐 Debug Auth Info:');
      console.log('- Account ID:', accountId);
      console.log('- JWT presente:', !!jwt);
      console.log('- JWT length:', jwt?.length);
      
      if (!accountId || !jwt) {
        throw new Error('No hay información de sesión válida');
      }

      const headers = {
        'Authorization': `Bearer ${jwt}`, // ✅ Usando jwt
        'Content-Type': 'application/json'
      };

      // Intentar obtener datos del usuario autenticado
      console.log('🔄 Intentando endpoint: /api/user/data');
      console.log('🔑 Headers enviados:', headers);
      
      try {
        const response = await this.http.get<any>(`${this.baseUrl}/user/data`, { 
          headers,
          withCredentials: true // ✅ Incluir cookies en la petición
        }).toPromise();
        
        console.log('✅ Respuesta de /api/user/data:', response);
        
        if (response) {
          const userData: UserData = {
            name: response.name || 'Usuario',
            lastName: response.lastName || '',
            dni: response.dni || '',
            email: response.email || '',
            alias: response.alias || 'usuario.alias', // ✅ Este es el alias de la cuenta
            cvu: response.cvu || '0000000000000000000000',
            username: response.username || 'usuario', // ✅ Este es el username del usuario
            balance: response.balance || 0,
            idAccount: response.idAccount?.toString() || accountId
          };
          
          console.log('✅ UserData mapeado desde /api/user/data:', userData);
          this.userDataSubject.next(userData);
          this.saveUserDataToStorage(userData);
          return userData;
        }
      } catch (userDataError: any) {
        console.log('❌ Error con endpoint /api/user/data:', userDataError);
        console.log('📋 Status del error:', userDataError.status);
        console.log('📋 Mensaje del error:', userDataError.message);
        
        // ⚠️ Si el endpoint principal falla, intentar showBalance como fallback
        console.log('🔄 Intentando endpoint de cuenta: /api/accounts/' + accountId + '/showBalance');
        
        try {
          const accountResponse = await this.http.get<any>(`${this.baseUrl}/accounts/${accountId}/showBalance`, { headers }).toPromise();
          console.log('✅ Respuesta de showBalance:', accountResponse);
          
          if (accountResponse) {
            const userData: UserData = {
              name: 'Usuario', // ⚠️ Datos genéricos porque showBalance no devuelve info personal
              lastName: 'ArCash',
              dni: '12345678',
              email: 'usuario@arcash.com',
              alias: accountResponse.alias || 'usuario.arcash',
              cvu: accountResponse.cvu || '0000003100010000000001',
              username: 'usuario123',
              balance: accountResponse.balance || 0,
              idAccount: accountId
            };
            
            console.log('✅ UserData desde showBalance (fallback):', userData);
            this.userDataSubject.next(userData);
            this.saveUserDataToStorage(userData);
            return userData;
          }
        } catch (accountError: any) {
          console.log('❌ Error también con endpoint showBalance:', accountError);
          console.log('📋 Status del error de cuenta:', accountError.status);
        }
        
        // ❌ Si todo falla, lanzar el error
        throw new Error(`Error cargando datos: ${userDataError.status} - ${userDataError.message}`);
      }
      
      throw new Error('No se pudo obtener respuesta del servidor');
    } catch (error) {
      console.error('❌ DataService: Error loading user data:', error);
      throw error;
    }
  }

  /**
   * Obtiene los datos del usuario actual
   */
  getCurrentUserData(): UserData | null {
    return this.userDataSubject.value;
  }

  /**
   * Obtiene las transacciones actuales
   */
  getCurrentTransactions(): Transaction[] {
    return this.transactionsSubject.value;
  }

  /**
   * Actualiza el saldo del usuario
   */
  async updateBalance(): Promise<number> {
    try {
      const accountId = localStorage.getItem("accountId");
      const jwt = localStorage.getItem('JWT');
      
      if (!accountId || !jwt) throw new Error('No hay información de sesión válida');
      
      const headers = {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      };
      
      const response = await this.http.get<any>(`${this.baseUrl}/accounts/${accountId}/showBalance`, { headers }).toPromise();
      
      if (!response) {
        throw new Error('No se pudo obtener el saldo');
      }
      
      const newBalance = parseFloat(response.balance);
      
      // Actualizar el saldo en el estado local
      const currentUser = this.getCurrentUserData();
      if (currentUser) {
        const updatedUser = { ...currentUser, balance: newBalance };
        this.userDataSubject.next(updatedUser);
        this.saveUserDataToStorage(updatedUser);
      }
      
      return newBalance;
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  /**
   * Actualiza el alias del usuario
   */
  async updateAlias(newAlias: string): Promise<void> {
    try {
      const accountId = localStorage.getItem("accountId");
      if (!accountId) throw new Error('No account ID found');
      
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.http.put(`${this.baseUrl}/accounts/${accountId}/changeAlias`, { newAlias }).toPromise();
      
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
  async updateUsername(newUsername: string): Promise<void> {
    try {
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.http.put(`${this.baseUrl}/auth/changeUsername`, { newUsername }).toPromise();
      
      // Actualizar estado local
      const currentUser = this.getCurrentUserData();
      if (currentUser) {
        const updatedUser = { ...currentUser, username: newUsername };
        this.userDataSubject.next(updatedUser);
        this.saveUserDataToStorage(updatedUser);
      }
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
      console.log('🔄 DataService: Cargando transacciones...');
      
      const accountId = localStorage.getItem('accountId');
      const jwt = localStorage.getItem('JWT'); // ✅ Corregido: usar 'JWT'
      
      if (!accountId || !jwt) {
        throw new Error('No hay información de sesión válida');
      }

      const headers = {
        'Authorization': `Bearer ${jwt}`, // ✅ Usando jwt
        'Content-Type': 'application/json'
      };

      try {
        // Intentar obtener transacciones del backend
        console.log('🔄 Intentando endpoint: /api/transactions/' + accountId + '/getTransactions');
        console.log('🔑 Headers:', headers);
        const response = await this.http.get<any[]>(`${this.baseUrl}/transactions/${accountId}/getTransactions`, { 
          headers,
          withCredentials: true // ✅ Incluir cookies en la petición
        }).toPromise();
        
        if (!response || !Array.isArray(response)) {
          console.log('🔄 DataService: No hay transacciones disponibles en el backend');
          this.transactionsSubject.next([]);
          return [];
        }
        
        const transactions: Transaction[] = response.map((tx: any) => ({
          id: tx.idTransaction,
          type: tx.idOrigin === parseInt(accountId) ? 'expense' : 'income',
          description: tx.idOrigin === parseInt(accountId) ? 
            `Transferencia a ${tx.destinationAlias || tx.destinationUsername}` : 
            `Transferencia de ${tx.originAlias || tx.originUsername}`,
          amount: parseFloat(tx.amount),
          date: new Date(tx.date),
          from: tx.idOrigin !== parseInt(accountId) ? tx.originAlias || tx.originUsername : undefined,
          to: tx.idOrigin === parseInt(accountId) ? tx.destinationAlias || tx.destinationUsername : undefined,
          status: tx.state || 'COMPLETED'
        }));
        
        console.log('✅ DataService: Transacciones cargadas exitosamente -', transactions.length, 'transacciones');
        this.transactionsSubject.next(transactions);
        return transactions;
        
      } catch (endpointError) {
        console.log('❌ Error con endpoint de transacciones:', endpointError);
        
        // ❌ Si falla, lanzar error en lugar de usar datos fake
        throw new Error(`Error cargando transacciones: ${endpointError}`);
      }
      
    } catch (error) {
      console.error('❌ DataService: Error loading transactions:', error);
      // En caso de error, devolver array vacío en lugar de fallar
      this.transactionsSubject.next([]);
      return [];
    }
  }

  /**
   * Agrega una nueva transacción a la lista
   */
  addTransaction(transaction: Transaction): void {
    const currentTransactions = this.transactionsSubject.value;
    const updatedTransactions = [transaction, ...currentTransactions];
    this.transactionsSubject.next(updatedTransactions);
  }

  /**
   * Obtiene el balance actualizado de la cuenta usando el endpoint showBalance
   */
  async refreshBalance(): Promise<number | null> {
    try {
      const accountId = localStorage.getItem('accountId');
      const jwt = localStorage.getItem('JWT'); // ✅ Corregido: usar 'JWT'
      
      if (!accountId || !jwt) {
        console.log('❌ No hay información de sesión para actualizar balance');
        return null;
      }

      const headers = {
        'Authorization': `Bearer ${jwt}`, // ✅ Usando jwt
        'Content-Type': 'application/json'
      };

      console.log('🔄 Actualizando balance desde /api/accounts/' + accountId + '/showBalance');
      
      const response = await this.http.get<any>(`${this.baseUrl}/accounts/${accountId}/showBalance`, { 
        headers,
        withCredentials: true // ✅ Incluir cookies en la petición
      }).toPromise();
      
      if (response && response.balance !== undefined) {
        const newBalance = response.balance;
        console.log('✅ Balance actualizado:', newBalance);
        
        // Actualizar el userData con el nuevo balance
        const currentUser = this.getCurrentUserData();
        if (currentUser) {
          const updatedUser = { ...currentUser, balance: newBalance };
          this.userDataSubject.next(updatedUser);
          this.saveUserDataToStorage(updatedUser);
        }
        
        return newBalance;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error actualizando balance:', error);
      return null;
    }
  }

  // --- OPERACIONES FINANCIERAS ---
  
  /**
   * Ingresa dinero a la cuenta del usuario
   */
  async depositMoney(amount: number): Promise<void> {
    try {
      const accountId = localStorage.getItem("accountId");
      if (!accountId) throw new Error('No account ID found');
      
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.http.put(`${this.baseUrl}/accounts/${accountId}/balance`, { balance: amount }).toPromise();
      
      // Actualizar saldo local
      const currentUser = this.getCurrentUserData();
      if (currentUser) {
        const updatedUser = { ...currentUser, balance: currentUser.balance + amount };
        this.userDataSubject.next(updatedUser);
        this.saveUserDataToStorage(updatedUser);
        
        // Agregar transacción
        const transaction: Transaction = {
          id: Date.now(),
          type: 'income',
          description: 'Depósito de dinero',
          amount: amount,
          date: new Date(),
          status: 'COMPLETED'
        };
        this.addTransaction(transaction);
      }
    } catch (error) {
      console.error('Error depositing money:', error);
      throw error;
    }
  }

  /**
   * Busca una cuenta por alias o CVU
   */
  async searchAccount(aliasOrCvu: string): Promise<AccountSearchResult> {
    try {
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.http.get<AccountSearchResult>(`${this.baseUrl}/transactions/search/${aliasOrCvu}`).toPromise();
      
      // Mock response
      const mockAccount: AccountSearchResult = {
        idaccount: '2',
        alias: 'destino.ejemplo',
        cvu: '0000003100010000000002',
        user: {
          nombre: 'María',
          apellido: 'García',
          dni: '87654321'
        }
      };
      
      return mockAccount;
    } catch (error) {
      console.error('Error searching account:', error);
      throw error;
    }
  }

  /**
   * Realiza una transferencia de dinero
   */
  async transferMoney(destinationAccountId: string, amount: number): Promise<void> {
    try {
      const sourceAccountId = localStorage.getItem("accountId");
      if (!sourceAccountId) throw new Error('No source account ID found');
      
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.http.post(`${this.baseUrl}/transactions/${sourceAccountId}/transfer/${destinationAccountId}`, { balance: amount }).toPromise();
      
      // Actualizar saldo local
      const currentUser = this.getCurrentUserData();
      if (currentUser) {
        if (currentUser.balance < amount) {
          throw new Error('Saldo insuficiente');
        }
        
        const updatedUser = { ...currentUser, balance: currentUser.balance - amount };
        this.userDataSubject.next(updatedUser);
        this.saveUserDataToStorage(updatedUser);
        
        // Agregar transacción
        const transaction: Transaction = {
          id: Date.now(),
          type: 'expense',
          description: 'Transferencia enviada',
          amount: amount,
          date: new Date(),
          to: destinationAccountId,
          status: 'COMPLETED'
        };
        this.addTransaction(transaction);
      }
    } catch (error) {
      console.error('Error transferring money:', error);
      throw error;
    }
  }

  // --- CALCULADORA DE IMPUESTOS ---
  
  /**
   * Calcula impuestos para pesos argentinos
   */
  async calculateTaxesARS(amount: number): Promise<TaxCalculationResult> {
    try {
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.http.get<TaxCalculationResult>(`${this.baseUrl}/impuestos/calculateARS?montoARS=${amount}`).toPromise();
      
      // Mock calculation
      const iva = amount * 0.21;
      const result: TaxCalculationResult = {
        montoOriginal: amount,
        iva: iva,
        totalFinal: amount + iva
      };
      
      return result;
    } catch (error) {
      console.error('Error calculating taxes ARS:', error);
      throw error;
    }
  }

  /**
   * Calcula impuestos para dólares estadounidenses
   */
  async calculateTaxesUSD(amount: number): Promise<TaxCalculationResult> {
    try {
      // TODO: Reemplazar con llamada real al backend
      // const response = await this.http.get<TaxCalculationResult>(`${this.baseUrl}/impuestos/calculateUSD?montoUSD=${amount}`).toPromise();
      
      // Mock calculation
      const precioDolar = 1000; // Cotización mock
      const montoARS = amount * precioDolar;
      const iva = montoARS * 0.21;
      const percepcionGanancias = montoARS * 0.30;
      
      const result: TaxCalculationResult = {
        montoOriginal: montoARS,
        iva: iva,
        percepcionGanancias: percepcionGanancias,
        precioDolar: precioDolar,
        totalFinal: montoARS + iva + percepcionGanancias
      };
      
      return result;
    } catch (error) {
      console.error('Error calculating taxes USD:', error);
      throw error;
    }
  }

  // --- MÉTODOS PRIVADOS ---
  
  /**
   * Carga los datos del usuario desde localStorage
   */
  private loadUserDataFromStorage(): void {
    console.log('📂 DataService: Cargando datos desde localStorage...');
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        console.log('✅ DataService: Datos encontrados en localStorage');
        this.userDataSubject.next(userData);
      } catch (error) {
        console.error('❌ DataService: Error parsing stored user data:', error);
      }
    } else {
      console.log('📂 DataService: No hay datos en localStorage');
    }
  }

  /**
   * Guarda los datos del usuario en localStorage
   */
  private saveUserDataToStorage(userData: UserData): void {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('accountId', userData.idAccount);
  }

  /**
   * Limpia todos los datos almacenados
   */
  clearAllData(): void {
    this.userDataSubject.next(null);
    this.transactionsSubject.next([]);
    localStorage.removeItem('userData');
    localStorage.removeItem('accountId');
    localStorage.removeItem('JWT');
    localStorage.removeItem('role');
  }
}
