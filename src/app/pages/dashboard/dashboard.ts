///Imports generales
import { Component, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
// V--- CAMBIO: Importamos forkJoin ---V
import { Subscription, interval, forkJoin, of } from 'rxjs';
// ^-----------------------------------^
import { QRCodeComponent } from 'angularx-qrcode';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { switchMap } from 'rxjs/operators';

// Services
import { themeService } from '../../services/theme-service/theme-service';
import { UtilService } from '../../services/util-service/util-service';
import { AuthService } from '../../services/auth-service/auth-service';
import { DataService } from '../../services/data-service/data-service';
import { ModalService } from '../../services/modal-service/modal-service';
import { TransactionService } from '../../services/transaction-service/transaction-service';
import { FavoriteService } from '../../services/favorite-service/favorite-service';
import { DeviceService } from '../../services/device-service/device.service';
import { CacheService } from '../../services/cache-service/cache.service';
import { AdminService } from '../../services/admin-service/admin.service';

// Models
import Transaction from '../../models/transaction';
import UserData from '../../models/user-data';
import qrData from '../../models/qrData';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent, ZXingScannerModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Suscripciones generales
  private subscriptions: Subscription[] = [];
  
  // V--- CAMBIO: Unificamos las suscripciones de polling ---V
  private dataPollingSubscription: Subscription | null = null;
  // ^------------------------------------------------------^

  // Estados de carga y visibilidad
  isLoading = true;
  balanceVisible = true;

  // Control de acceso de admin
  isAdmin = false;

  // Datos del usuario (inicializados)
  userData: UserData = {
    name: 'Cargando...', lastName: '', dni: '', email: '', alias: '',
    cvu: '', username: '', balance: 0, idAccount: ''
  };

  // Datos del QR (inicializados)
  qrCodeDataObject: qrData | null = null;
  qrCodeDataString: string | null = null;

  // Variables para el escáner (inicializadas)
  isScanning = false;
  hasPermission: boolean | null = null;

  // Transacciones (inicializadas)
  recentTransactions: Transaction[] = [];
  allTransactions: Transaction[] = [];
  displayedTransactions: Transaction[] = [];
  transactionPageSize = 20;
  currentTransactionPage = 0;
  isLoadingMoreTransactions = false;
  hasLoadedAllTransactions = false;
  hasMoreTransactions = false; 

  // Nuevas variables para controlar el estado del modal
  private isInAllTransactionsModal = false;
  private forceKeepTransactions = false;

  // Sistema de modal único
  currentModal: string | null = null;

  // Estados de modales (mantener para visibilidad controlada por updateModalStates)
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
  showQrModal = false;
  showDeleteFavoriteModal = false;

  // Estados del proceso de transferencia
  transferStep = 1;
  destinatarioInput = '';
  montoTransfer: number | null = null;
  montoIngresar: number | null = null;
  cuentaDestinoData: any = null;
  transferCompletedData: any = null;

  // Estados de carga para botones
  isIngresandoDinero = false;
  isBalanceUpdating = false;
  isBalanceDecreasing = false;
  isBuscandoCuenta = false;
  isTransfiriendo = false;
  isLoadingQr = false;

  // Estados de contactos favoritos
  favoriteContacts: any[] = [];
  selectedFavoriteContact: any = null;
  favoriteContactAlias = '';
  favoriteContactDescription = '';
  showAddToFavoritesOption = false;
  isUpdatingFavorite = false;
  isAddingFavorite = false;
  
  isDeletingFavorite = false;
  favoriteToDelete: any = null;

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

  hiddenTransactionIds: Set<number> = new Set<number>();

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
    private cacheService: CacheService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef, 
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.deviceService.configurePerformanceOptimizations();
  }

  ngOnInit(): void {
    this.checkAuthentication();
    this.checkAdminRole();
    this.setupSubscriptions();

    // Llamada inicial para cargar datos (sin forzar refresh al inicio)
    this.dataService.loadUserData().subscribe({
      next: (data) => {
        if (!data) {
          console.error(">>> Dashboard ngOnInit: loadUserData inicial devolvió null.");
        }
      },
      error: (err) => console.error(">>> Dashboard ngOnInit: ERROR crítico en loadUserData inicial:", err)
    });

    // Carga otros datos iniciales
    this.initializeServices();
    this.startSimpleLoading();

    // V--- CAMBIO: INICIA EL POLLING UNIFICADO ---V
    if (isPlatformBrowser(this.platformId)) {
      this.startDataPolling(10000); 
    }
    // ^-----------------------------------------^
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones guardadas
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // V--- CAMBIO: DETIENE EL POLLING UNIFICADO ---V
    this.stopDataPolling();
    // ^------------------------------------------^
  }

  // V--- CAMBIO: MÉTODOS DE POLLING UNIFICADOS ---V
  private startDataPolling(intervalMs: number = 10000): void {
    this.stopDataPolling(); // Evita duplicados

    this.dataPollingSubscription = interval(intervalMs)
      .pipe(
        switchMap(() => {
          // Solo cargar transacciones si NO estamos en el modal de todas las transacciones
          return forkJoin([
            this.dataService.loadUserData(true),
            this.isInAllTransactionsModal ? 
              of(null) : // No actualizar transacciones si estamos en el modal
              this.transactionService.loadAllTransactions(true)
          ]);
        })
      )
      .subscribe({
        next: ([userData, transactions]) => {
          // Si estamos en el modal, no hacer nada con las transacciones
          if (this.isInAllTransactionsModal) {
            return;
          }
        },
        error: (err) => {
          console.error(">>> Polling: Error durante la actualización de datos:", err);
        }
      });

    // Guardamos la suscripción para poder cancelarla en ngOnDestroy
    this.subscriptions.push(this.dataPollingSubscription);
  }

  private stopDataPolling(): void {
    if (this.dataPollingSubscription) {
      this.dataPollingSubscription.unsubscribe();
      this.dataPollingSubscription = null;
    }
  }
  // ^---- FIN MÉTODOS POLLING UNIFICADOS ----^

  private async initializeServices(): Promise<void> {
    try {
      await Promise.all([
        this.transactionService.loadAllTransactions(),
        this.favoriteService.loadFavoriteContacts()
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
    this.showQrModal = false;
    this.showDeleteFavoriteModal = false;

    // Activar el modal correspondiente
    switch (currentModal) {
      case 'ingresar':
        this.showIngresarModal = true;
        break;
      case 'myQr':
        this.showQrModal = true;
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
      case 'deleteFavorite':
        this.showDeleteFavoriteModal = true;
        break;
    }
  }

  private startSimpleLoading(): void {
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
    this.loadDataInBackground();
  }

  private setupSubscriptions(): void {
    // Suscribirse a los datos del usuario
    const userDataSub = this.dataService.userData$.subscribe(userDataFromService => {
      if (userDataFromService) {
        this.userData = userDataFromService;
      } else {
        this.userData = {
          name: '', lastName: '', dni: '', email: '', alias: '',
          cvu: '', username: '', balance: 0, idAccount: ''
        };
      }
      this.cdr.detectChanges();
    });
    this.subscriptions.push(userDataSub);

    // Suscribirse a las transacciones usando el service
    const recentTransactionsSub = this.transactionService.recentTransactions$.subscribe((transactions: Transaction[]) => {
      this.recentTransactions = transactions.filter(
        transaction => !this.hiddenTransactionIds.has(transaction.id)
      );
      this.cdr.detectChanges();
    });
    this.subscriptions.push(recentTransactionsSub);

    const allTransactionsSub = this.transactionService.allTransactions$.subscribe((transactions: Transaction[]) => {
      this.allTransactions = transactions;
      
      // Solo actualizar displayedTransactions si NO estamos en el modal de todas las transacciones
      // o si no estamos forzando a mantener las transacciones
      if (!this.isInAllTransactionsModal || !this.forceKeepTransactions) {
        this.updateDisplayedTransactions();
      }
      this.cdr.detectChanges();
    });
    this.subscriptions.push(allTransactionsSub);

    // Suscribirse a displayedTransactions del servicio para paginación
    const displayedTransactionsSub = this.transactionService.displayedTransactions$.subscribe((transactions: Transaction[]) => {
      // Cuando estamos en el modal, usar las transacciones paginadas del servicio
      if (this.isInAllTransactionsModal) {
        this.displayedTransactions = transactions.filter(
          transaction => !this.hiddenTransactionIds.has(transaction.id)
        );
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(displayedTransactionsSub);

    // Suscribirse a los favoritos usando el service
    const favoritesSub = this.favoriteService.favoriteContacts$.subscribe(favorites => {
      this.favoriteContacts = favorites;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(favoritesSub);

    const selectedFavoriteSub = this.favoriteService.selectedFavorite$.subscribe(favorite => {
      this.selectedFavoriteContact = favorite;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(selectedFavoriteSub);

    // Suscribirse al estado de los modales
    const modalSub = this.modalService.modalState$.subscribe(state => {
      this.currentModal = state.currentModal;
      this.updateModalStates(state.currentModal);
      this.cdr.detectChanges();
    });
    this.subscriptions.push(modalSub);
  }

  private async loadDataInBackground(): Promise<void> {
    try {
      const promises = [];

      const currentUser = this.dataService.getCurrentUserData();
      if (!currentUser) {
        promises.push(this.dataService.loadUserData());
      }

      const currentTransactions = this.dataService.getCurrentTransactions();
      if (!currentTransactions || currentTransactions.length === 0) {
        promises.push(this.dataService.loadTransactions());
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
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

  // --- CONTROL DE ACCESO DE ADMIN ---
  checkAdminRole(): void {
    this.isAdmin = this.adminService.isAdmin();
  }

  async goToAdminPanel(): Promise<void> {
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN') {
      this.utilService.showToast('No tienes permisos para acceder al panel de administración', 'error');
      return;
    }

    this.isLoading = true;

    try {
      await this.adminService.checkAccess().toPromise();
      this.router.navigate(['/admin']);
    } catch (error: any) {
      console.error('Error al verificar acceso de admin:', error);
      if (error.status === 403 || error.status === 401) {
        this.utilService.showToast('No tienes permisos para acceder al panel de administración', 'error');
      } else if (error.status === 0) {
        this.utilService.showToast('No se puede conectar con el servidor. Verifica que el backend esté ejecutándose.', 'error');
      } else {
        this.utilService.showToast('Error del servidor. Intenta más tarde.', 'error');
      }
    } finally {
      this.isLoading = false;
    }
  }

  // --- LÓGICA DE NEGOCIO ---
  async ingresarDinero(): Promise<void> {
    if (!this.montoIngresar || this.montoIngresar <= 0) {
      this.utilService.showToast('Por favor ingrese un monto válido', 'error');
      return;
    }

    this.isIngresandoDinero = true;

    try {
      await this.dataService.ingresarDinero(this.montoIngresar);
      this.utilService.showToast(`Ingreso exitoso de $${this.montoIngresar}`, 'success');
      this.closeIngresarModal();

      setTimeout(() => {
        this.isBalanceUpdating = true;
        setTimeout(() => {
          this.isBalanceUpdating = false;
        }, 1500);
      }, 100);

    } catch (error) {
      console.error('Error ingresando dinero:', error);
      this.utilService.showToast('Error al ingresar dinero', 'error');
    } finally {
      this.isIngresandoDinero = false;
    }
  }

  async buscarCuenta(): Promise<void> {
    if (!this.destinatarioInput.trim()) {
      this.utilService.showToast('Por favor ingrese un Alias o CVU', 'error');
      return;
    }

    this.isBuscandoCuenta = true;

    try {
      this.cuentaDestinoData = await this.dataService.buscarCuenta(this.destinatarioInput.trim());

      const currentUser = this.dataService.getCurrentUserData();
      if (currentUser && this.cuentaDestinoData.idaccount === currentUser.idAccount) {
        this.utilService.showToast('No puedes transferir dinero a tu misma cuenta', 'error');
        return;
      }

      const accountId = parseInt(this.cuentaDestinoData.idaccount.toString());
      if (!isNaN(accountId)) {
        const esFavorito = await this.verificarSiEsFavorito(
          accountId, 
          this.cuentaDestinoData.cvu
        );
        this.cuentaDestinoData.isFromFavorite = esFavorito;
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

    setTimeout(() => {
      this.isBalanceDecreasing = true;
    }, 7800);

    this.isTransfiriendo = true;

    let accountIdForTransfer: string;
    let accountIdNumber: number;

    try {
      if (this.cuentaDestinoData.isFromFavorite) {
        try {
          const accountData = await this.dataService.buscarCuenta(this.cuentaDestinoData.cvu);
          accountIdForTransfer = accountData.idaccount.toString();
          accountIdNumber = parseInt(accountIdForTransfer, 10);
          if (isNaN(accountIdNumber)) throw new Error('ID de cuenta inválido obtenido de favorito.');
        } catch (searchError) {
          console.error('Error buscando cuenta para transferencia desde favorito:', searchError);
          this.utilService.showToast('Error al buscar info de la cuenta favorita', 'error');
          this.isBalanceDecreasing = false;
          this.isTransfiriendo = false;
          return;
        }
      } else {
        accountIdForTransfer = this.cuentaDestinoData.idaccount.toString();
        accountIdNumber = parseInt(accountIdForTransfer, 10);
        if (isNaN(accountIdNumber)) throw new Error('ID de cuenta inválido obtenido de búsqueda/QR.');
      }

      const esFavoritoExistente = await this.verificarSiEsFavorito(
        accountIdNumber, 
        this.cuentaDestinoData?.cvu
      );
      
      await this.dataService.realizarTransferencia(accountIdForTransfer, this.montoTransfer);
      this.dataService.loadUserData(true).subscribe();

      setTimeout(() => {
        this.isBalanceDecreasing = false;
      }, 9300);

      this.transferCompletedData = { ...this.cuentaDestinoData, idaccount: accountIdNumber };

      if (esFavoritoExistente) {
        this.utilService.showToast('Transferencia realizada con éxito', 'success');
        this.closeTransferModal();
      } else {
        this.transferStep = 4;
      }

      await this.transactionService.loadAllTransactions(true);

    } catch (error) {
      console.error('Error realizando transferencia:', error);
      this.utilService.showToast('Error al realizar la transferencia', 'error');
      this.isBalanceDecreasing = false;
      this.dataService.loadUserData(true).subscribe();
    } finally {
      this.isTransfiriendo = false;
    }
  }

  private async verificarSiEsFavorito(accountId: number, cvu?: string): Promise<boolean> {
    try {
      await this.favoriteService.loadFavoriteContacts();
      return this.favoriteContacts.some(fav => {
        if (fav.favoriteAccount && fav.favoriteAccount.idAccount === accountId) {
          return true;
        }
        if (fav.accountCbu && cvu && fav.accountCbu === cvu) {
          return true;
        }
        return false;
      });
    } catch (error) {
      console.error('Error verificando favoritos:', error);
      return false;
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

      let result = '';
      if (this.selectedCurrency === 'ARS') {
        result = `
          <p><strong class="label">Monto sin impuestos:</strong> <span class="value">$${this.formatMoney(resultData.montoOriginal)} ARS</span></p>
          <p><strong class="label">IVA 21%:</strong> <span class="value">$${this.formatMoney(resultData.iva)} ARS</span></p>
          <p><strong class="label">Total con impuestos:</strong> <span class="value strong">$${this.formatMoney(resultData.totalFinal)} ARS</span></p>
        `;
      } else {
        result = `
          <p><strong class="label">Monto original USD:</strong> <span class="value">$${this.formatMoney(this.taxMonto)} USD</span></p>
          <p><strong class="label">Cotización dólar oficial:</strong> <span class="value">$${this.formatMoney(resultData.precioDolar || 0)} ARS</span></p>
          <p><strong class="label">Monto en ARS:</strong> <span class="value">$${this.formatMoney(resultData.montoOriginal)} ARS</span></p>
          <p><strong class="label">IVA 21%:</strong> <span class="value">$${this.formatMoney(resultData.iva)} ARS</span></p>
          <p><strong class="label">Total final:</strong> <span class="value strong">$${this.formatMoney(resultData.totalFinal)} ARS</span></p>
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

  cerrarModalQr(): void {
    this.isLoadingQr = false;
    this.modalService.closeModal()
  }

  openIngresarModal(): void {
    this.montoIngresar = null;
    this.isIngresandoDinero = false;
    this.openModal('ingresar');
  }

  closeIngresarModal(): void {
    this.closeAllModals();
    this.montoIngresar = null;
    this.isIngresandoDinero = false;
    this.isBalanceUpdating = false;
    this.isBalanceDecreasing = false;
  }

  openTransferModal(): void {
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = null;
    this.cuentaDestinoData = null;
    this.isBuscandoCuenta = false;
    this.isTransfiriendo = false;
    this.isBalanceDecreasing = false;
    this.isScanning = false;
    this.openModal('transfer');
  }

  closeTransferModal(): void {
    if (this.cuentaDestinoData?.isFromFavorite && this.selectedFavoriteContact) {
      this.isScanning = false;
      this.transferStep = 1;
      this.destinatarioInput = '';
      this.montoTransfer = 0;
      this.cuentaDestinoData = null;
      this.isBuscandoCuenta = false;
      this.isTransfiriendo = false;
      this.isBalanceDecreasing = false;
      this.closeAllModals();
      this.showFavoriteDetailsModal = true;
      return;
    }

    this.closeAllModals();
    this.isScanning = false;
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = 0;
    this.cuentaDestinoData = null;
    this.selectedFavoriteContact = null;
    this.isBuscandoCuenta = false;
    this.isTransfiriendo = false;
    this.isBalanceDecreasing = false;
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

  openMyQrModal(): void {
    const accountId = localStorage.getItem('accountId')
    if (!accountId) {
      console.error("No se encontro el ID de la cuenta en el localStorage.")
      return;
    }
    const accountIdNumber = parseInt(accountId, 10)
    this.isLoadingQr = true;
    this.modalService.openModal('myQr')

    this.dataService.getMyQrData(accountIdNumber).subscribe({
      next: (data) => {
        this.qrCodeDataObject = data;
        this.qrCodeDataString = JSON.stringify(data);
        this.isLoadingQr = false;
      },
      error: (err) => {
        console.error("Error al obtener los datos del QR", err)
        this.isLoadingQr = false;
        this.modalService.closeModal()
      }
    })
  }

  ///METODOS PARA ESCANEAR EL QR
  startScanning(): void {
    this.isScanning = true;
    this.hasPermission = null;
  }

  cancelScanning(): void {
    this.isScanning = false;
  }

  handlePermissionResponse(permission: boolean): void {
    this.hasPermission = permission;
    if (!permission) {
      this.utilService.showToast('Permiso de cámara denegado', 'error');
      this.isScanning = false;
    }
  }

  handleScanError(error: Error): void {
    console.error("Error con el escáner:", error);
    this.utilService.showToast('Error al iniciar la cámara', 'error');
  }

  handleScanSuccess(resultString: string): void {
    this.isScanning = false;
    this.isBuscandoCuenta = true;

    setTimeout(() => {
      try {
        const qrData = JSON.parse(resultString);

        if (qrData && qrData.walletApp === 'ArCashV1') {
          const currentUser = this.dataService.getCurrentUserData();
          if (currentUser && parseInt(currentUser.idAccount) === qrData.accountId) {
            this.utilService.showToast('No puedes transferir a tu misma cuenta', 'error');
            this.isBuscandoCuenta = false;
            return;
          }

          this.cuentaDestinoData = {
            alias: qrData.accountAlias,
            cvu: 'Obtenido por QR',
            user: {
              nombre: qrData.receiverName.split(' ')[0],
              apellido: qrData.receiverName.split(' ').slice(1).join(' '),
              dni: qrData.dni,
              email: qrData.email
            },
            idaccount: qrData.accountId
          };
          this.transferStep = 2;
        } else {
          throw new Error('QR no válido para ArCash');
        }
      } catch (error) {
        console.error("Error al procesar QR:", error);
        this.utilService.showToast('El código QR no es válido', 'error');
      } finally {
        this.isBuscandoCuenta = false;
      }
    }, 500);
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

  // Modificado: Control mejorado del modal de todas las transacciones
  async openAllTransactionsModal(): Promise<void> {
    try {
      this.isInAllTransactionsModal = true;
      this.forceKeepTransactions = true;
      
      this.currentTransactionPage = 0;
      this.hasLoadedAllTransactions = false;
      this.isLoadingMoreTransactions = false;
      this.hasMoreTransactions = true;

      await this.transactionService.loadAllTransactions(false);
      this.updateDisplayedTransactions();
      this.openModal('allTransactions');
    } catch (error) {
      console.error('Error cargando todas las transacciones:', error);
      this.utilService.showToast('Error al cargar las transacciones', 'error');
    }
  }

  // Modificado: Carga más transacciones sin forzar recarga
  async loadMoreTransactions(): Promise<void> {
    if (this.isLoadingMoreTransactions || !this.hasMoreTransactions) {
      return;
    }

    this.isLoadingMoreTransactions = true;
    this.forceKeepTransactions = true;

    try {
      this.currentTransactionPage++;
      this.transactionService.loadMoreTransactions();
      this.updateDisplayedTransactionsFromService();
    } catch (error) {
      console.error('Error cargando más transacciones:', error);
      this.utilService.showToast('Error al cargar más transacciones', 'error');
      this.currentTransactionPage--;
    } finally {
      this.isLoadingMoreTransactions = false;
    }
  }

  // Modificado: Cierra el modal y restablece estados
  closeAllTransactionsModal(): void {
    this.isInAllTransactionsModal = false;
    this.forceKeepTransactions = false;
    this.closeAllModals();
    this.updateDisplayedTransactions();
  }

  // --- MÉTODOS DE CONTACTOS FAVORITOS ---
  async openFavoritesModal(): Promise<void> {
    await this.favoriteService.loadFavoriteContacts();
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

  backToFavoritesList(): void {
    this.showFavoriteDetailsModal = false;
    this.selectedFavoriteContact = null;
    this.favoriteService.clearSelectedFavorite();
    this.showFavoritesModal = true;
  }

  async transferToFavorite(favorite: any): Promise<void> {
    this.cuentaDestinoData = this.favoriteService.createTransferDataFromFavorite(favorite);
    this.selectedFavoriteContact = favorite;
    this.transferStep = 3;
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

    this.isAddingFavorite = true;

    try {
      if (!this.transferCompletedData.idaccount) {
        console.error('Error: idaccount no disponible en transferCompletedData:', this.transferCompletedData);
        this.utilService.showToast('Error: ID de cuenta no disponible', 'error');
        return;
      }

      let accountId: number;

      if (typeof this.transferCompletedData.idaccount === 'number') {
        accountId = this.transferCompletedData.idaccount;
      } else {
        accountId = parseInt(this.transferCompletedData.idaccount.toString());
        
        if (isNaN(accountId)) {
          const searchTerm = this.transferCompletedData.cvu || this.transferCompletedData.alias;
          if (!searchTerm) {
            this.utilService.showToast('Error: No se puede identificar la cuenta', 'error');
            return;
          }
          
          const accountData = await this.dataService.buscarCuenta(searchTerm);
          accountId = parseInt(accountData.idaccount);
          
          if (isNaN(accountId)) {
            this.utilService.showToast('Error: No se pudo obtener el ID de cuenta', 'error');
            return;
          }
        }
      }

      const isAlreadyFavorite = await this.verificarSiEsFavorito(
        accountId,
        this.transferCompletedData?.cvu
      );

      const currentUser = this.dataService.getCurrentUserData();
      const currentUserId = parseInt(currentUser?.idAccount || '0');
      
      if (currentUserId === accountId) {
        this.utilService.showToast('No puedes agregarte a ti mismo como favorito', 'error');
        return;
      }

      if (isAlreadyFavorite) {
        this.utilService.showToast('Esta cuenta ya está en tus favoritos', 'error');
        return;
      }

      const success = await this.favoriteService.addFavoriteContact(
        accountId,
        this.favoriteContactAlias.trim(),
        this.favoriteContactDescription.trim() || undefined
      );

      if (success) {
        this.utilService.showToast('Contacto agregado a favoritos', 'success');
        this.closeAddFavoriteModal();
        this.closeTransferModal();
      } else {
        this.utilService.showToast('Error al agregar el contacto a favoritos', 'error');
      }

    } catch (error) {
      console.error('Error agregando a favoritos:', error);
      this.utilService.showToast('Error al agregar el contacto a favoritos', 'error');
    } finally {
      this.isAddingFavorite = false;
    }
  }

  skipAddToFavorites(): void {
    this.utilService.showToast('Transferencia realizada con éxito', 'success');
    this.closeAddFavoriteModal();
    this.closeTransferModal();
  }

  openEditFavoriteModal(favorite: any): void {
    this.selectedFavoriteContact = favorite;
    this.favoriteContactAlias = favorite.contactAlias;
    this.favoriteContactDescription = favorite.description || '';
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

    this.isUpdatingFavorite = true;

    try {
      const success = await this.favoriteService.updateFavoriteContact(
        this.selectedFavoriteContact.id,
        this.favoriteContactAlias.trim(),
        this.favoriteContactDescription.trim() || undefined
      );

      if (success) {
        this.utilService.showToast('Contacto actualizado correctamente', 'success');
        this.closeEditFavoriteModal();
      } else {
        this.utilService.showToast('Error al actualizar el contacto', 'error');
      }
    } catch (error) {
      console.error('Error updating favorite contact:', error);
      this.utilService.showToast('Error al actualizar el contacto', 'error');
    } finally {
      this.isUpdatingFavorite = false;
    }
  }

  async removeFavoriteContact(favorite: any): Promise<void> {
    this.openDeleteFavoriteModal(favorite);
  }

  // --- MÉTODOS DE NAVEGACIÓN ENTRE PASOS ---
  confirmarCuenta(): void {
    this.transferStep = 3;
  }

  cancelarBusqueda(): void {
    if (this.cuentaDestinoData?.isFromFavorite && this.selectedFavoriteContact) {
      this.transferStep = 1;
      this.destinatarioInput = '';
      this.cuentaDestinoData = null;
      this.isScanning = false;
      this.closeAllModals();
      this.showFavoriteDetailsModal = true;
      return;
    }

    this.transferStep = 1;
    this.destinatarioInput = '';
    this.cuentaDestinoData = null;
    this.selectedFavoriteContact = null;
    this.isScanning = false;
  }

  volverAConfirmacion(): void {
    if (this.cuentaDestinoData?.isFromFavorite && this.selectedFavoriteContact) {
      this.transferStep = 2;
      this.montoTransfer = null;
      this.closeAllModals();
      this.showFavoriteDetailsModal = true;
      return;
    }

    this.transferStep = 2;
    this.montoTransfer = null;
  }

  volverBusqueda(): void {
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = null;
    this.cuentaDestinoData = null;
    this.isScanning = false;
  }

  // --- OTROS MÉTODOS ---
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleBalance(): void {
    this.balanceVisible = !this.balanceVisible;
  }

  logout(): void {
    this.isLoading = true;
    const jwt = localStorage.getItem('JWT');

    if (!jwt) {
      setTimeout(() => {
        this.performLocalLogout();
      }, 1500);
      return;
    }

    this.authService.logoutUser().subscribe({
      next: (response) => {
        setTimeout(() => {
          this.performLocalLogout();
        }, 1500);
      },
      error: (error) => {
        setTimeout(() => {
          this.performLocalLogout();
        }, 1500);
      }
    });
  }

  private performLocalLogout(): void {
    this.authService.clearLocalSession();
    this.clearAllCaches();
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
    this.utilService.showToast('Sesión cerrada exitosamente', 'success');
    this.isLoading = false;
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private clearAllCaches(): void {
    try {
      this.favoriteService.invalidateCache();
      this.transactionService.invalidateCache();
      const clearedCount = this.cacheService.clearCachesByPrefix('arcash_');
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
    return this.formatMoney(amount);
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

    if (transaction.type === 'income') {
      return transaction.from || 'Cuenta externa';
    } else {
      return 'Mi cuenta';
    }
  }

  getTransactionDestination(transaction: Transaction): string {
    const currentUser = this.dataService.getCurrentUserData();
    if (!currentUser) return 'Desconocido';

    if (transaction.type === 'income') {
      return 'Mi cuenta';
    } else {
      return transaction.to || 'Cuenta externa';
    }
  }

  onModalBackdropClick(event: MouseEvent, modalType: string): void {
    if (event.target === event.currentTarget) {
      this.closeAllModals();
    }
  }

  trackTransaction(index: number, transaction: Transaction): number {
    return transaction.id;
  }

  formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else {
      return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  trackFavorite(index: number, favorite: any): string {
    return `${index}_${favorite.id}_${favorite.contactAlias}_${Date.now()}`;
  }

  formatMoney(value: number): string {
    if (value == null || isNaN(value)) return '0';
    if (value % 1 === 0) {
      return value.toLocaleString('es-AR');
    }
    const formatted = value.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return formatted;
  }

  removeTransactionFromList(transaction: Transaction): void {
    this.hiddenTransactionIds.add(transaction.id);
    this.updateDisplayedTransactions();
    this.utilService.showToast('Transacción eliminada de la lista', 'success');
  }

  // Modificado: Mejor control de la actualización de transacciones mostradas
  private updateDisplayedTransactions(): void {
    // Si estamos en el modal, usar la lógica de paginación del servicio
    if (this.isInAllTransactionsModal) {
      this.updateDisplayedTransactionsFromService();
      return;
    }

    // Lógica normal para fuera del modal
    const filteredTransactions = this.allTransactions.filter(
      transaction => !this.hiddenTransactionIds.has(transaction.id)
    );

    this.displayedTransactions = filteredTransactions.slice(
      0,
      (this.currentTransactionPage + 1) * this.transactionPageSize
    );

    const totalFilteredTransactions = filteredTransactions.length;
    const currentlyDisplayed = this.displayedTransactions.length;
    
    this.hasMoreTransactions = currentlyDisplayed < totalFilteredTransactions;
    this.hasLoadedAllTransactions = !this.hasMoreTransactions;
  }

  // Nuevo método: Actualizar desde el servicio para paginación
  private updateDisplayedTransactionsFromService(): void {
    const displayed = this.transactionService.getDisplayedTransactions();
    this.displayedTransactions = displayed.filter(
      transaction => !this.hiddenTransactionIds.has(transaction.id)
    );
    
    this.hasMoreTransactions = this.transactionService.hasMoreTransactions();
    this.hasLoadedAllTransactions = !this.hasMoreTransactions;
  }

  openDeleteFavoriteModal(favorite: any): void {
    this.favoriteToDelete = favorite;
    this.isDeletingFavorite = false;
    this.openModal('deleteFavorite');
  }

  closeDeleteFavoriteModal(): void {
    this.closeAllModals();
    this.favoriteToDelete = null;
    this.isDeletingFavorite = false;
  }

  async confirmDeleteFavorite(): Promise<void> {
    if (!this.favoriteToDelete) {
      return;
    }

    this.isDeletingFavorite = true;

    try {
      const success = await this.favoriteService.removeFavoriteContact(
        this.favoriteToDelete.id, 
        this.favoriteToDelete.contactAlias
      );

      if (success) {
        this.utilService.showToast('Contacto eliminado de favoritos', 'success');
        this.closeDeleteFavoriteModal();
        
        if (this.showFavoriteDetailsModal) {
          this.closeFavoriteDetailsModal();
        }
      } else {
        this.utilService.showToast('Error al eliminar el contacto', 'error');
      }
    } catch (error) {
      console.error('Error eliminando favorito:', error);
      this.utilService.showToast('Error al eliminar el contacto', 'error');
    } finally {
      this.isDeletingFavorite = false;
    }
  }
}