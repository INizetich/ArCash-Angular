import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// Services
import { themeService } from '../../services/theme-service';
import { UtilService } from '../../services/util-service';
import { AuthService } from '../../services/auth-service';
import { DataService } from '../../services/data-service';
import { ModalService } from '../../services/modal-service';
import { TransactionService } from '../../services/transaction-service';
import { FavoriteService } from '../../services/favorite-service';
import { DeviceService } from '../../services/device.service';
import { CacheService } from '../../services/cache.service';

// Models
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
  
  // Todas las transacciones para el modal
  allTransactions: Transaction[] = [];
  
  // Paginación para transacciones
  displayedTransactions: Transaction[] = [];
  transactionPageSize = 20;
  currentTransactionPage = 0;

  // Sistema de modal único para mejor performance
  currentModal: string | null = null;
  
  // Estados de modales (mantener para compatibilidad pero optimizar uso)
  showIngresarModal = false;
  showTransferModal = false;
  showAliasModal = false;
  showTaxModal = false;
  showProfileModal = false;
  showTransactionModal = false;
  showAllTransactionsModal = false;
  showFavoritesModal = false;
  showAddFavoriteModal = false;
  showFavoriteDetailsModal = false;
  showEditFavoriteModal = false;

  // Estados del proceso de transferencia
  transferStep = 1; // 1: buscar, 2: confirmar, 3: monto, 4: agregar a favoritos
  destinatarioInput = '';
  montoTransfer = 0;
  montoIngresar = 0;
  cuentaDestinoData: any = null;
  transferCompletedData: any = null; // Para guardar datos después de transferencia exitosa

  // Estados de carga para botones
  isIngresandoDinero = false; // Estado de carga para el botón de ingresar dinero
  isBalanceUpdating = false; // Estado para la animación del saldo (ingreso - verde)
  isBalanceDecreasing = false; // Estado para la animación del saldo (transferencia - rojo)
  isBuscandoCuenta = false; // Estado de carga para buscar cuenta
  isTransfiriendo = false; // Estado de carga para el botón de transferir

  // Estados de contactos favoritos
  favoriteContacts: any[] = [];
  selectedFavoriteContact: any = null;
  favoriteContactAlias = '';
  favoriteContactDescription = '';
  showAddToFavoritesOption = false;

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
    private dataService: DataService,
    private modalService: ModalService,
    private transactionService: TransactionService,
    private favoriteService: FavoriteService,
    private deviceService: DeviceService,
    private cacheService: CacheService
  ) {
    // Configurar optimizaciones de rendimiento basadas en el dispositivo
    this.deviceService.configurePerformanceOptimizations();
  }
  
  ngOnInit(): void {
    
    this.checkAuthentication();
    this.setupSubscriptions();
    
    // Cargar datos usando los services
    this.initializeServices();
    
    // Cargar simple y rápido
    this.startSimpleLoading();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Cargar datos iniciales usando los services (con caché si está disponible)
      await Promise.all([
        this.transactionService.loadAllTransactions(), // Usar caché
        this.favoriteService.loadFavoriteContacts()    // Usar caché
      ]);
    } catch (error) {
      console.error('Error inicializando services:', error);
    }
  }

  private updateModalStates(currentModal: string | null): void {
    // Resetear todos los estados de modales
    this.showIngresarModal = false;
    this.showTransferModal = false;
    this.showAliasModal = false;
    this.showTaxModal = false;
    this.showProfileModal = false;
    this.showTransactionModal = false;
    this.showAllTransactionsModal = false;
    this.showFavoritesModal = false;
    this.showAddFavoriteModal = false;
    this.showFavoriteDetailsModal = false;
    this.showEditFavoriteModal = false;

    // Activar el modal correspondiente
    switch (currentModal) {
      case 'ingresar':
        this.showIngresarModal = true;
        break;
      case 'transfer':
        this.showTransferModal = true;
        break;
      case 'alias':
        this.showAliasModal = true;
        break;
      case 'tax':
        this.showTaxModal = true;
        break;
      case 'profile':
        this.showProfileModal = true;
        break;
      case 'transaction':
        this.showTransactionModal = true;
        break;
      case 'allTransactions':
        this.showAllTransactionsModal = true;
        break;
      case 'favorites':
        this.showFavoritesModal = true;
        break;
      case 'addFavorite':
        this.showAddFavoriteModal = true;
        break;
      case 'favoriteDetails':
        this.showFavoriteDetailsModal = true;
        break;
      case 'editFavorite':
        this.showEditFavoriteModal = true;
        break;
    }
  }

  private startSimpleLoading(): void {
    // Carga rápida y simple sin efectos
    setTimeout(() => {
      this.isLoading = false;
    }, 200); // Muy rápido

    // Cargar datos en background sin efectos
    this.loadDataInBackground();
  }



  private setupSubscriptions(): void {
    // Suscribirse a los datos del usuario
    const userDataSub = this.dataService.userData$.subscribe(userData => {
      if (userData) {
        this.userData = userData;
      }
    });
    this.subscriptions.push(userDataSub);

    // Suscribirse a las transacciones usando el service
    const recentTransactionsSub = this.transactionService.recentTransactions$.subscribe((transactions: Transaction[]) => {
      this.recentTransactions = transactions;
    });
    this.subscriptions.push(recentTransactionsSub);

    const allTransactionsSub = this.transactionService.allTransactions$.subscribe((transactions: Transaction[]) => {
      this.allTransactions = transactions;
    });
    this.subscriptions.push(allTransactionsSub);

    const displayedTransactionsSub = this.transactionService.displayedTransactions$.subscribe((transactions: Transaction[]) => {
      this.displayedTransactions = transactions;
    });
    this.subscriptions.push(displayedTransactionsSub);

    // Suscribirse a los favoritos usando el service
    const favoritesSub = this.favoriteService.favoriteContacts$.subscribe(favorites => {
      this.favoriteContacts = favorites;
    });
    this.subscriptions.push(favoritesSub);

    const selectedFavoriteSub = this.favoriteService.selectedFavorite$.subscribe(favorite => {
      this.selectedFavoriteContact = favorite;
    });
    this.subscriptions.push(selectedFavoriteSub);

    // Suscribirse al estado de los modales
    const modalSub = this.modalService.modalState$.subscribe(state => {
      this.currentModal = state.currentModal;
      // Actualizar los estados de modales específicos
      this.updateModalStates(state.currentModal);
    });
    this.subscriptions.push(modalSub);
  }

  private async loadDataInBackground(): Promise<void> {
    try {
     
      // Cargar datos en paralelo para mejor performance
      const promises = [];
      
      const currentUser = this.dataService.getCurrentUserData();
      if (!currentUser) {

        promises.push(this.dataService.loadUserData());
      }
      
      const currentTransactions = this.dataService.getCurrentTransactions();
      if (!currentTransactions || currentTransactions.length === 0) {
    
        promises.push(this.dataService.loadTransactions());
      }
      
      // Ejecutar todas las cargas en paralelo
      await Promise.allSettled(promises);
      
     
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
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

    // Activar estado de carga
    this.isIngresandoDinero = true;

    try {
      await this.dataService.ingresarDinero(this.montoIngresar);
      
      this.utilService.showToast(`Ingreso exitoso de $${this.montoIngresar}`, 'success');
      
      // Cerrar el modal primero
      this.closeIngresarModal();
      
      // Luego activar la animación del saldo (con un pequeño delay para que se vea el saldo actualizado)
      setTimeout(() => {
        this.isBalanceUpdating = true;
        
        // Desactivar la animación después de que termine
        setTimeout(() => {
          this.isBalanceUpdating = false;
        }, 1500); // 1.5 segundos, igual que la duración de la animación
      }, 100);
      
    } catch (error) {
      console.error('Error ingresando dinero:', error);
      this.utilService.showToast('Error al ingresar dinero', 'error');
    } finally {
      // Desactivar estado de carga
      this.isIngresandoDinero = false;
    }
  }

  async buscarCuenta(): Promise<void> {
    if (!this.destinatarioInput.trim()) {
      this.utilService.showToast('Por favor ingrese un Alias o CVU', 'error');
      return;
    }

    // Activar estado de carga
    this.isBuscandoCuenta = true;

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
    } finally {
      // Desactivar estado de carga
      this.isBuscandoCuenta = false;
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

    // Activar estado de carga
    this.isTransfiriendo = true;

    try {
      let accountIdForTransfer: string;

      // Si viene de un favorito, necesitamos buscar el ID real de la cuenta
      if (this.cuentaDestinoData.isFromFavorite) {
        try {
          // Buscar la cuenta usando el CBU para obtener el ID real
          const accountData = await this.dataService.buscarCuenta(this.cuentaDestinoData.cvu);
          accountIdForTransfer = accountData.idaccount.toString();
        } catch (searchError) {
          console.error('Error buscando cuenta para transferencia:', searchError);
          this.utilService.showToast('Error al buscar información de la cuenta', 'error');
          return;
        }
      } else {
        // Para búsquedas normales, usamos el ID numérico como string
        accountIdForTransfer = this.cuentaDestinoData.idaccount.toString();
      }

      
      await this.dataService.realizarTransferencia(accountIdForTransfer, this.montoTransfer);
      
      // Activar inmediatamente el efecto del saldo después de la transferencia
      setTimeout(() => {
        this.isBalanceDecreasing = true;
        
        setTimeout(() => {
          this.isBalanceDecreasing = false;
        }, 1500);
      }, 50); // Efecto inmediato después de la transferencia
      
      // Guardar datos para posible agregado a favoritos
      this.transferCompletedData = { ...this.cuentaDestinoData };
      
      // Verificar si ya es favorito
      const isAlreadyFavorite = this.favoriteContacts.some(fav => 
        fav.accountCbu === this.cuentaDestinoData.cvu
      );
      
      if (!isAlreadyFavorite) {
        // Mostrar opción para agregar a favoritos
        this.transferStep = 4;
        this.showAddToFavoritesOption = true;
        
      } else {
        // Si ya es favorito, actualizar el orden y cerrar
        await this.favoriteService.loadFavoriteContacts(true); // Forzar recarga
        this.utilService.showToast('Transferencia realizada con éxito', 'success');
        this.closeTransferModal();
      }
      
      // Recargar transacciones y balance
      await this.transactionService.loadAllTransactions(true); // Forzar recarga
    } catch (error) {
      console.error('Error realizando transferencia:', error);
      this.utilService.showToast('Error al realizar la transferencia', 'error');
    } finally {
      // Desactivar estado de carga
      this.isTransfiriendo = false;
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

  // --- MÉTODOS OPTIMIZADOS DE MODALES ---
  
  private closeAllModals(): void {
    this.modalService.closeModal();
  }
  
  private openModal(modalType: string): void {
    this.modalService.openModal(modalType);
  }

  openIngresarModal(): void {
    this.montoIngresar = 0;
    this.isIngresandoDinero = false; // Resetear estado de carga
    this.openModal('ingresar');
  }

  closeIngresarModal(): void {
    this.closeAllModals();
    this.montoIngresar = 0;
    this.isIngresandoDinero = false; // Resetear estado de carga
    this.isBalanceUpdating = false; // Resetear animación del saldo
    this.isBalanceDecreasing = false; // Resetear animación de transferencia
  }

  async openTransferModal(): Promise<void> {
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = 0;
    this.cuentaDestinoData = null;
    this.isBuscandoCuenta = false; // Resetear estado de búsqueda
    this.isTransfiriendo = false; // Resetear estado de transferencia
    this.isBalanceDecreasing = false; // Resetear animación de transferencia
    
    // Cargar favoritos al abrir el modal
    console.log('Abriendo modal de transferencia, cargando favoritos...');
    try {
      await this.favoriteService.loadFavoriteContacts(true); // Forzar recarga desde servidor
      console.log('Favoritos cargados correctamente desde servidor');
    } catch (error) {
      console.error('Error cargando favoritos:', error);
    }
    
    this.openModal('transfer');
  }

  closeTransferModal(): void {
    this.closeAllModals();
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = 0;
    this.cuentaDestinoData = null;
    this.isBuscandoCuenta = false; // Resetear estado de búsqueda
    this.isTransfiriendo = false; // Resetear estado de transferencia
    this.isBalanceDecreasing = false; // Resetear animación de transferencia
  }

  openAliasModal(): void {
    this.openModal('alias');
  }

  closeAliasModal(): void {
    this.closeAllModals();
  }

  openTaxModal(): void {
    this.showTaxForm = false;
    this.selectedCurrency = 'ARS';
    this.taxMonto = 0;
    this.taxResult = '';
    this.openModal('tax');
  }

  closeTaxModal(): void {
    this.closeAllModals();
    this.showTaxForm = false;
  }

  openProfileModal(): void {
    this.editingAlias = false;
    this.editingUsername = false;
    this.openModal('profile');
  }

  closeProfileModal(): void {
    this.closeAllModals();
    this.editingAlias = false;
    this.editingUsername = false;
  }

  openTransactionModal(transaction: Transaction): void {
    this.selectedTransaction = transaction;
    this.openModal('transaction');
  
  }

  closeTransactionModal(): void {
    this.closeAllModals();
    this.selectedTransaction = null;
  }

  async openAllTransactionsModal(): Promise<void> {
    try {
      await this.transactionService.loadAllTransactions(); // Usar caché si está disponible
      this.openModal('allTransactions');
    } catch (error) {
      console.error('Error cargando todas las transacciones:', error);
      this.utilService.showToast('Error al cargar las transacciones', 'error');
    }
  }
  
  loadMoreTransactions(): void {
    this.transactionService.loadMoreTransactions();
  }
  
  get hasMoreTransactions(): boolean {
    return this.transactionService.hasMoreTransactions();
  }

  closeAllTransactionsModal(): void {
    this.closeAllModals();
  }

  // --- MÉTODOS DE CONTACTOS FAVORITOS ---

  async openFavoritesModal(): Promise<void> {
    // Cargar favoritos antes de abrir el modal para mejor UX
    await this.favoriteService.loadFavoriteContacts(); // Usar caché si está disponible
    this.openModal('favorites');
  }

  closeFavoritesModal(): void {
    this.closeAllModals();
  }



  openFavoriteDetailsModal(favorite: any): void {
    this.favoriteService.selectFavorite(favorite);
    this.openModal('favoriteDetails');
  }

  closeFavoriteDetailsModal(): void {
    this.closeAllModals();
    this.favoriteService.clearSelectedFavorite();
  }

  async transferToFavorite(favorite: any): Promise<void> {
    // Configurar datos de transferencia usando el service
    this.cuentaDestinoData = this.favoriteService.createTransferDataFromFavorite(favorite);
    this.transferStep = 3;
    
    // Cerrar todos los modales y abrir el de transferencia inmediatamente
    this.closeAllModals();
    this.openModal('transfer');
  }

  openAddFavoriteModal(): void {
    this.favoriteContactAlias = '';
    this.favoriteContactDescription = '';
    this.openModal('addFavorite');
  }

  closeAddFavoriteModal(): void {
    this.closeAllModals();
    this.favoriteContactAlias = '';
    this.favoriteContactDescription = '';
    this.showAddToFavoritesOption = false;
  }

  async addToFavorites(): Promise<void> {
    if (!this.favoriteContactAlias.trim()) {
      this.utilService.showToast('Por favor ingresa un nombre para el contacto', 'error');
      return;
    }

    if (!this.transferCompletedData) {
      this.utilService.showToast('Error: datos de transferencia no disponibles', 'error');
      return;
    }

    // Validar que idaccount existe y es válido
    if (!this.transferCompletedData.idaccount) {
      console.error('Error: idaccount no disponible en transferCompletedData:', this.transferCompletedData);
      this.utilService.showToast('Error: ID de cuenta no disponible', 'error');
      return;
    }

    let accountId: number;

    // Verificar si los datos vienen de un favorito (donde idaccount es un CBU)
    if (this.transferCompletedData.isFromFavorite) {
      // Los datos vienen de un favorito, necesitamos buscar el ID real de la cuenta
      this.utilService.showToast('Buscando información de la cuenta...', 'info');
      
      try {
        // Buscar la cuenta usando el CBU para obtener el ID real
        const accountData = await this.dataService.buscarCuenta(this.transferCompletedData.cvu);
        accountId = parseInt(accountData.idaccount);
        
        if (isNaN(accountId)) {
          console.error('Error: No se pudo obtener un ID válido de la búsqueda:', accountData);
          this.utilService.showToast('Error: No se pudo obtener el ID de cuenta', 'error');
          return;
        }
      } catch (error) {
        console.error('Error buscando cuenta:', error);
        this.utilService.showToast('Error al buscar información de la cuenta', 'error');
        return;
      }
    } else {
      // Los datos vienen de una búsqueda normal, convertir directamente
      accountId = parseInt(this.transferCompletedData.idaccount.toString());
      
      if (isNaN(accountId)) {
        console.error('Error: idaccount no se puede convertir a número:', this.transferCompletedData.idaccount);
        this.utilService.showToast('Error: ID de cuenta inválido', 'error');
        return;
      }
    }

    // Verificar si ya existe como favorito
    // Primero verificar por CBU (método original)
    const isAlreadyFavoriteByCbu = this.favoriteContacts.some(fav => 
      fav.accountCbu === this.transferCompletedData.cvu
    );

    // Verificar si estás intentando agregarte a ti mismo
    const currentUser = this.dataService.getCurrentUserData();
  
    // Verificar ambas formas de comparación (string vs number)
    const isSelfAsString = currentUser?.idAccount === accountId.toString();
    const isSelfAsNumber = parseInt(currentUser?.idAccount || '0') === accountId;
    
    if (isSelfAsString || isSelfAsNumber) {
      this.utilService.showToast('No puedes agregarte a ti mismo como favorito', 'error');
      return;
    }

    if (isAlreadyFavoriteByCbu) {
      this.utilService.showToast('Esta cuenta ya está en tus favoritos', 'error');
      return;
    }

    const success = await this.favoriteService.addFavoriteContact(
      accountId, 
      this.favoriteContactAlias.trim(),
      this.favoriteContactDescription.trim() || undefined
    );

    if (success) {
      this.closeAddFavoriteModal();
      this.closeTransferModal();
    }
  }

  skipAddToFavorites(): void {
    this.utilService.showToast('Transferencia realizada con éxito', 'success');
    this.closeAddFavoriteModal();
    this.closeTransferModal();
  }

  openEditFavoriteModal(favorite: any): void {
    // Configurar datos del favorito para editar
    this.selectedFavoriteContact = favorite;
    this.favoriteContactAlias = favorite.contactAlias;
    this.favoriteContactDescription = favorite.description || '';
    
    // Cerrar todos los modales y abrir el de edición inmediatamente
    this.closeAllModals();
    this.openModal('editFavorite');
  }

  closeEditFavoriteModal(): void {
    this.closeAllModals();
    this.selectedFavoriteContact = null;
    this.favoriteContactAlias = '';
    this.favoriteContactDescription = '';
  }

  async updateFavoriteContact(): Promise<void> {
    if (!this.favoriteContactAlias.trim()) {
      this.utilService.showToast('Por favor ingresa un nombre para el contacto', 'error');
      return;
    }

    if (!this.selectedFavoriteContact) {
      this.utilService.showToast('Error: contacto no seleccionado', 'error');
      return;
    }

    const success = await this.favoriteService.updateFavoriteContact(
      this.selectedFavoriteContact.id,
      this.favoriteContactAlias.trim(),
      this.favoriteContactDescription.trim() || undefined
    );

    if (success) {
      this.closeEditFavoriteModal();
    }
  }

  async removeFavoriteContact(favorite: any): Promise<void> {
    const success = await this.favoriteService.removeFavoriteContact(favorite.id, favorite.contactAlias);
    
    if (success) {
      this.closeFavoriteDetailsModal();
    }
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
    
    // Limpiar todos los cachés de los servicios
    this.clearAllCaches();
    
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

  private clearAllCaches(): void {
    try {
      // Limpiar cachés específicos de los servicios
      this.favoriteService.invalidateCache();
      this.transactionService.invalidateCache();
      
      // Limpiar todos los cachés de ArCash usando el CacheService centralizado
      const clearedCount = this.cacheService.clearCachesByPrefix('arcash_');
      
      // Limpiar también cachés específicos que pueden haber quedado
      const additionalCaches = [
        'arcash_favorites_cache',
        'arcash_favorites_cache_expiry', 
        'arcash_transactions_cache',
        'arcash_transactions_cache_expiry',
        'arcash_user_cache',
        'arcash_user_cache_expiry'
      ];
      
      additionalCaches.forEach(cacheKey => {
        localStorage.removeItem(cacheKey);
      });
    
    } catch (error) {
      console.error('Error limpiando cachés:', error);
    }
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
    return this.transactionService.formatAmount(amount);
  }

  formatDate(date: Date): string {
    return this.transactionService.formatDate(date);
  }

  formatDateDetailed(date: Date): string {
    return this.transactionService.formatDateDetailed(date);
  }

  getTransactionClass(transaction: Transaction): string {
    return this.transactionService.getTransactionClass(transaction);
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
    // Solo cerrar si se hace clic en el backdrop (no en el contenido del modal)
    if (event.target === event.currentTarget) {
      // Usar el método optimizado para cerrar modales
      this.closeAllModals();
    }
  }

  trackTransaction(index: number, transaction: Transaction): number {
    return transaction.id;
  }
  
  trackFavorite(index: number, favorite: any): string {
    // Usar índice + timestamp para garantizar unicidad
    return `${index}_${favorite.id}_${favorite.contactAlias}_${Date.now()}`;
  }

}
