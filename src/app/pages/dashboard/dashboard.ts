import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { themeService } from '../../services/theme-service';
import { UtilService } from '../../services/util-service';
import { AuthService } from '../../services/auth-service';
import { DataService } from '../../services/data-service';
import Transaction from '../../models/transaction';
import UserData from '../../models/user-data';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Suscripciones
  private subscriptions: Subscription[] = [];

  // Propiedades para cleanup
  private mouseListener?: (e: MouseEvent) => void;

  // Estados de carga y visibilidad
  isLoading = true;
  balanceVisible = true;

  // Datos del usuario
  userData: UserData = {
    name: 'Cargando...',
    lastName: '',
    dni: '',
    email: '',
    alias: '',
    cvu: '',
    username: '',
    balance: 0,
    idAccount: ''
  };

  // Transacciones recientes
  recentTransactions: Transaction[] = [];

  // Estados de modales
  showIngresarModal = false;
  showTransferModal = false;
  showAliasModal = false;
  showTaxModal = false;
  showProfileModal = false;
  showTransactionModal = false;
  showAllTransactionsModal = false;

  // Estados del proceso de transferencia
  transferStep = 1; // 1: buscar, 2: confirmar, 3: monto
  destinatarioInput = '';
  montoTransfer = 0;
  montoIngresar = 0;
  cuentaDestinoData: any = null;

  // Estados de la calculadora de impuestos
  selectedCurrency = 'ARS';
  taxMonto = 0;
  taxResult = '';
  showTaxForm = false;

  // Estado de perfil
  editingAlias = false;
  editingUsername = false;
  newAlias = '';
  newUsername = '';

  // Transacción seleccionada para el modal
  selectedTransaction: Transaction | null = null;

  constructor(
    private router: Router,
    private themeService: themeService,
    private utilService: UtilService,
    private authService: AuthService,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Dashboard component initialized');
    this.setupMouseTracking();
    this.checkAuthentication();
    this.setupSubscriptions();
    
    // Cargar transacciones inmediatamente
    this.loadTransactionsOnInit();
    
    // Simular carga elegante con progreso real
    this.startElegantLoading();
  }

  private setupMouseTracking(): void {
    let ticking = false;
    
    this.mouseListener = (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const x = (e.clientX / window.innerWidth) * 100;
          const y = (e.clientY / window.innerHeight) * 100;
          
          document.documentElement.style.setProperty('--mouse-x', `${x}%`);
          document.documentElement.style.setProperty('--mouse-y', `${y}%`);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    // Throttle usando requestAnimationFrame para mejor performance
    document.addEventListener('mousemove', this.mouseListener, { passive: true });
  }

  private startElegantLoading(): void {
    // Reducir tiempo de carga para mejor UX
    setTimeout(() => {
      this.isLoading = false;
    }, 800); // Reducido a 0.8 segundos

    // Cargar datos reales en paralelo de forma más eficiente
    this.loadDataInBackground();
  }

  private async loadTransactionsOnInit(): Promise<void> {
    try {
      console.log('💳 Cargando transacciones al iniciar...');
      
      // Verificar si ya hay transacciones cargadas
      const currentTransactions = this.dataService.getCurrentTransactions();
      if (!currentTransactions || currentTransactions.length === 0) {
        console.log('📥 No hay transacciones en cache, cargando desde servidor...');
        await this.dataService.loadTransactions();
      } else {
        console.log('✅ Transacciones ya disponibles en cache:', currentTransactions.length);
        this.recentTransactions = currentTransactions;
      }
    } catch (error) {
      console.error('❌ Error cargando transacciones:', error);
    }
  }

  private setupSubscriptions(): void {
   
    
    // Suscribirse a los datos del usuario
    const userDataSub = this.dataService.userData$.subscribe(userData => {
      if (userData) {
       
        this.userData = userData;
      }
    });
    this.subscriptions.push(userDataSub);

    // Suscribirse a las transacciones
    const transactionsSub = this.dataService.transactions$.subscribe(transactions => {
    
      this.recentTransactions = transactions;
    });
    this.subscriptions.push(transactionsSub);
  }

  private async loadDataInBackground(): Promise<void> {
    try {
      console.log('🔄 Cargando datos en background...');
      
      // Cargar datos en paralelo para mejor performance
      const promises = [];
      
      const currentUser = this.dataService.getCurrentUserData();
      if (!currentUser) {
        console.log('⏳ Cargando usuario...');
        promises.push(this.dataService.loadUserData());
      }
      
      const currentTransactions = this.dataService.getCurrentTransactions();
      if (!currentTransactions || currentTransactions.length === 0) {
        console.log('⏳ Cargando transacciones...');
        promises.push(this.dataService.loadTransactions());
      }
      
      // Ejecutar todas las cargas en paralelo
      await Promise.allSettled(promises);
      
      console.log('✅ Datos cargados correctamente');
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Limpiar event listener del mouse para mejor performance
    if (this.mouseListener) {
      document.removeEventListener('mousemove', this.mouseListener);
    }
  }

  // --- AUTENTICACIÓN ---
  checkAuthentication(): void {
    const token = localStorage.getItem('JWT');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
  }

  // --- LÓGICA DE NEGOCIO ---
  async ingresarDinero(): Promise<void> {
    if (!this.montoIngresar || this.montoIngresar <= 0) {
      this.utilService.showToast('Por favor ingrese un monto válido', 'error');
      return;
    }

    try {
      await this.dataService.ingresarDinero(this.montoIngresar);
      this.utilService.showToast(`Ingreso exitoso de $${this.montoIngresar}`, 'success');
      this.closeIngresarModal();
    } catch (error) {
      console.error('Error ingresando dinero:', error);
      this.utilService.showToast('Error al ingresar dinero', 'error');
    }
  }

  async buscarCuenta(): Promise<void> {
    if (!this.destinatarioInput.trim()) {
      this.utilService.showToast('Por favor ingrese un Alias o CVU', 'error');
      return;
    }

    try {
      this.cuentaDestinoData = await this.dataService.buscarCuenta(this.destinatarioInput.trim());
      
      const currentUser = this.dataService.getCurrentUserData();
      if (currentUser && this.cuentaDestinoData.idaccount === currentUser.idAccount) {
        this.utilService.showToast('No puedes transferir dinero a tu misma cuenta', 'error');
        return;
      }

      this.transferStep = 2;
    } catch (error: any) {
      console.error('Error buscando cuenta:', error);
      if (error.message) {
        this.utilService.showToast(error.message, 'error');
      } else {
        this.utilService.showToast('Cuenta no encontrada', 'error');
      }
    }
  }

  async realizarTransferencia(): Promise<void> {
    if (!this.montoTransfer || this.montoTransfer <= 0) {
      this.utilService.showToast('Por favor ingrese un monto válido', 'error');
      return;
    }

    const currentUser = this.dataService.getCurrentUserData();
    if (!currentUser) {
      this.utilService.showToast('Error: datos de usuario no disponibles', 'error');
      return;
    }

    if (this.montoTransfer > currentUser.balance) {
      this.utilService.showToast('Saldo insuficiente', 'error');
      return;
    }

    try {
      await this.dataService.realizarTransferencia(this.cuentaDestinoData.idaccount, this.montoTransfer);
      this.utilService.showToast('Transferencia realizada con éxito', 'success');
      this.closeTransferModal();
    } catch (error) {
      console.error('Error realizando transferencia:', error);
      this.utilService.showToast('Error al realizar la transferencia', 'error');
    }
  }

  // --- CALCULADORA DE IMPUESTOS ---
  selectCurrency(currency: string): void {
    this.selectedCurrency = currency;
    this.showTaxForm = true;
    this.taxMonto = 0;
    this.taxResult = '';
  }

  async calcularImpuestos(): Promise<void> {
    if (!this.taxMonto || this.taxMonto <= 0) {
      this.utilService.showToast('Por favor ingrese un monto válido', 'error');
      return;
    }

    try {
      let resultData;
      if (this.selectedCurrency === 'ARS') {
        resultData = await this.dataService.calculateTaxesARS(this.taxMonto);
      } else {
        resultData = await this.dataService.calculateTaxesUSD(this.taxMonto);
      }
      
      // Formatear el resultado para mostrar en HTML
      let result = '';
      if (this.selectedCurrency === 'ARS') {
        result = `
          <p><strong class="label">Monto sin impuestos:</strong> <span class="value">$${resultData.montoOriginal.toFixed(2)} ARS</span></p>
          <p><strong class="label">IVA 21%:</strong> <span class="value">$${resultData.iva.toFixed(2)} ARS</span></p>
          <p><strong class="label">Total con impuestos:</strong> <span class="value strong">$${resultData.totalFinal.toFixed(2)} ARS</span></p>
        `;
      } else {
        result = `
          <p><strong class="label">Monto original USD:</strong> <span class="value">$${this.taxMonto.toFixed(2)} USD</span></p>
          <p><strong class="label">Cotización dólar oficial:</strong> <span class="value">$${resultData.precioDolar?.toFixed(2)} ARS</span></p>
          <p><strong class="label">Monto en ARS:</strong> <span class="value">$${resultData.montoOriginal.toFixed(2)} ARS</span></p>
          <p><strong class="label">IVA 21%:</strong> <span class="value">$${resultData.iva.toFixed(2)} ARS</span></p>
          <p><strong class="label">Total final:</strong> <span class="value strong">$${resultData.totalFinal.toFixed(2)} ARS</span></p>
        `;
      }
      this.taxResult = result;
    } catch (error) {
      console.error('Error calculando impuestos:', error);
      this.utilService.showToast('Error al calcular impuestos', 'error');
    }
  }

  // --- MÉTODOS DE MODALES ---
  openIngresarModal(): void {
    this.showIngresarModal = true;
    this.montoIngresar = 0;
  }

  closeIngresarModal(): void {
    this.showIngresarModal = false;
    this.montoIngresar = 0;
  }

  openTransferModal(): void {
    this.showTransferModal = true;
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = 0;
    this.cuentaDestinoData = null;
  }

  closeTransferModal(): void {
    this.showTransferModal = false;
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = 0;
    this.cuentaDestinoData = null;
  }

  openAliasModal(): void {
    this.showAliasModal = true;
  }

  closeAliasModal(): void {
    this.showAliasModal = false;
  }

  openTaxModal(): void {
    this.showTaxModal = true;
    this.showTaxForm = false;
    this.selectedCurrency = 'ARS';
    this.taxMonto = 0;
    this.taxResult = '';
  }

  closeTaxModal(): void {
    this.showTaxModal = false;
    this.showTaxForm = false;
  }

  openProfileModal(): void {
    this.showProfileModal = true;
    this.editingAlias = false;
    this.editingUsername = false;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.editingAlias = false;
    this.editingUsername = false;
  }

  openTransactionModal(transaction: Transaction): void {
    this.selectedTransaction = transaction;
    this.showTransactionModal = true;
    console.log('📄 Abriendo modal de transacción:', transaction);
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false;
    this.selectedTransaction = null;
  }

  openAllTransactionsModal(): void {
    this.showAllTransactionsModal = true;
  }

  closeAllTransactionsModal(): void {
    this.showAllTransactionsModal = false;
  }

  // --- MÉTODOS DE NAVEGACIÓN ENTRE PASOS ---
  confirmarCuenta(): void {
    this.transferStep = 3;
  }

  cancelarBusqueda(): void {
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.cuentaDestinoData = null;
  }

  volverBusqueda(): void {
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = 0;
  }

  // --- OTROS MÉTODOS ---
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleBalance(): void {
    this.balanceVisible = !this.balanceVisible;
  }

  logout(): void {
    
    
    // Obtener el token JWT del localStorage
    const jwt = localStorage.getItem('JWT');
    
    if (!jwt) {
      
      this.performLocalLogout();
      return;
    }

    // Llamar al endpoint de logout del backend
    this.authService.logoutUser(jwt).subscribe({
      next: (response) => {
       
        this.performLocalLogout();
      },
      error: (error) => {
       
        // Aunque falle el backend, limpiar la sesión local
        this.performLocalLogout();
      }
    });
  }

  private performLocalLogout(): void {
   
    
    // Limpiar localStorage usando el método del AuthService
    this.authService.clearLocalSession();
    
    // Limpiar cualquier otro dato local si es necesario
    this.userData = {
      name: 'Cargando...',
      lastName: '',
      dni: '',
      email: '',
      alias: '',
      cvu: '',
      username: '',
      balance: 0,
      idAccount: ''
    };
    
    this.recentTransactions = [];
    
    // Mostrar mensaje de éxito
    this.utilService.showToast('Sesión cerrada exitosamente', 'success');
    
  
    
    // Redireccionar al login
    this.router.navigate(['/login']);
  }

  // --- PERFIL ---
  startEditAlias(): void {
    this.editingAlias = true;
    const currentUser = this.dataService.getCurrentUserData();
    this.newAlias = currentUser?.alias || '';
  }

  cancelEditAlias(): void {
    this.editingAlias = false;
    this.newAlias = '';
  }

  async saveAlias(): Promise<void> {
    const aliasRegex = /^(?=.*[A-Za-z])(?=^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$)(?!.*\.\.)[A-Za-z0-9.]{4,25}$/;
    
    if (!aliasRegex.test(this.newAlias)) {
      this.utilService.showToast('Formato de alias inválido', 'error');
      return;
    }

    try {
      await this.dataService.updateAlias(this.newAlias);
      this.utilService.showToast('Alias actualizado correctamente', 'success');
      this.editingAlias = false;
    } catch (error) {
      console.error('Error updating alias:', error);
      this.utilService.showToast('Error al actualizar el alias', 'error');
    }
  }

  startEditUsername(): void {
    this.editingUsername = true;
    const currentUser = this.dataService.getCurrentUserData();
    this.newUsername = currentUser?.username || '';
  }

  cancelEditUsername(): void {
    this.editingUsername = false;
    this.newUsername = '';
  }

  async saveUsername(): Promise<void> {
    const regex = /^(?=.*[A-Za-z])[A-Za-z\d]{4,25}$/;
    
    if (!regex.test(this.newUsername) || /^\d+$/.test(this.newUsername)) {
      this.utilService.showToast('Formato inválido. Solo letras y números, al menos una letra', 'error');
      return;
    }

    try {
      await this.dataService.updateUsername(this.newUsername);
      this.utilService.showToast('Nombre de usuario actualizado correctamente', 'success');
      this.editingUsername = false;
    } catch (error) {
      console.error('Error updating username:', error);
      this.utilService.showToast('Error al actualizar el nombre de usuario', 'error');
    }
  }

  // --- UTILIDADES ---
  async copyToClipboard(text: string, type: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.utilService.showToast(`${type} copiado al portapapeles`, 'success');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.utilService.showToast(`No se pudo copiar el ${type}`, 'error');
    }
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

  getTransactionOrigin(transaction: Transaction): string {
    const currentUser = this.dataService.getCurrentUserData();
    if (!currentUser) return 'Desconocido';
    
    // Si la transacción es de entrada (income), el origen no es nuestra cuenta
    if (transaction.type === 'income') {
      return transaction.from || 'Cuenta externa';
    } else {
      // Si es de salida (expense), el origen es nuestra cuenta
      return 'Mi cuenta';
    }
  }

  getTransactionDestination(transaction: Transaction): string {
    const currentUser = this.dataService.getCurrentUserData();
    if (!currentUser) return 'Desconocido';
    
    // Si la transacción es de entrada (income), el destino es nuestra cuenta
    if (transaction.type === 'income') {
      return 'Mi cuenta';
    } else {
      // Si es de salida (expense), el destino no es nuestra cuenta
      return transaction.to || 'Cuenta externa';
    }
  }

  onModalBackdropClick(event: MouseEvent, modalType: string): void {
    if (event.target === event.currentTarget) {
      switch (modalType) {
        case 'ingresar':
          this.closeIngresarModal();
          break;
        case 'transfer':
          this.closeTransferModal();
          break;
        case 'alias':
          this.closeAliasModal();
          break;
        case 'tax':
          this.closeTaxModal();
          break;
        case 'profile':
          this.closeProfileModal();
          break;
        case 'transaction':
          this.closeTransactionModal();
          break;
        case 'allTransactions':
          this.closeAllTransactionsModal();
          break;
      }
    }
  }

  trackTransaction(index: number, transaction: Transaction): number {
    return transaction.id;
  }

}
