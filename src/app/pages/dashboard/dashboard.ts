///Imports generales
import { Component, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core'; 
import { isPlatformBrowser, CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs'; 
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
  // Suscripción específica para el polling del saldo
  private balancePollingSubscription: Subscription | null = null; 

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
  showQrModal = false; // Asegúrate que esta variable se llame así

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
    private cacheService: CacheService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef, // ChangeDetectorRef ya estaba inyectado
    @Inject(PLATFORM_ID) private platformId: Object // <-- NECESARIO PARA isPlatformBrowser
  ) {
    this.deviceService.configurePerformanceOptimizations();
  }

  ngOnInit(): void {
   

    this.checkAuthentication();
    this.checkAdminRole();
    this.setupSubscriptions(); // Se suscribe a userData$, transacciones, modales, etc.

    
    // Llamada inicial para cargar datos (sin forzar refresh al inicio)
    this.dataService.loadUserData().subscribe({
      next: (data) => {
        if (!data) {
          console.error(">>> Dashboard ngOnInit: loadUserData inicial devolvió null.");
          // Podrías redirigir si la carga inicial falla gravemente
        }
      },
      error: (err) => console.error(">>> Dashboard ngOnInit: ERROR crítico en loadUserData inicial:", err)
    });

    // Carga otros datos iniciales
    this.initializeServices();
    this.startSimpleLoading();

    // V--- INICIA EL POLLING DEL SALDO ---V
    if (isPlatformBrowser(this.platformId)) { // Asegúrate de que esto solo corra en el navegador
      this.startBalancePolling();
    }
    // ^-----------------------------------^

    
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones guardadas
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // V--- DETIENE EL POLLING ---V
    this.stopBalancePolling();
    // ^------------------------^
  }

  // ---- MÉTODOS PARA POLLING DEL SALDO ----
  private startBalancePolling(intervalMs: number = 7500): void { // Intervalo de 7 segundos por defecto
    // Si ya existe una suscripción, la cancela primero para evitar duplicados
    this.stopBalancePolling();

    // interval() crea un Observable que emite números secuenciales cada X ms
    this.balancePollingSubscription = interval(intervalMs)
      .pipe(
        // switchMap cancela la petición HTTP anterior si una nueva emisión ocurre antes de que termine
        switchMap(() => {
          // Llama a loadUserData forzando la recarga desde el backend
          return this.dataService.loadUserData(true);
        })
      )
      .subscribe({
        next: (data) => {
          if (data) {
            // No necesitamos hacer nada aquí porque setupSubscriptions ya reacciona a los cambios
            // Pero podríamos forzar detección si fuera necesario: this.cdr.detectChanges();
          } 
        },
        error: (err) => {
           console.error(">>> Polling: Error durante la llamada de loadUserData:", err);
           // Considera detener el polling o reintentar después de un tiempo si hay errores persistentes
        }
      });

    // Guardamos esta suscripción específica para poder cancelarla después
    this.subscriptions.push(this.balancePollingSubscription);
  }

  private stopBalancePolling(): void {
    if (this.balancePollingSubscription) {
      this.balancePollingSubscription.unsubscribe();
      this.balancePollingSubscription = null; // Limpia la referencia
    }
  }
  // ---- FIN MÉTODOS POLLING ----

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
    this.showQrModal = false;

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
    }
  }

  private startSimpleLoading(): void {
    // Carga rápida y simple sin efectos
    setTimeout(() => {
      this.isLoading = false;
    }, 1500); // Muy rápido

    // Cargar datos en background sin efectos
    this.loadDataInBackground();
  }



  private setupSubscriptions(): void {
    // Suscribirse a los datos del usuario
    const userDataSub = this.dataService.userData$.subscribe(userDataFromService => {
      if (userDataFromService) {
        this.userData = userDataFromService; // Asigna el objeto COMPLETO
      } else {
        // Resetea userData si llega null
        this.userData = {
           name: '', lastName: '', dni: '', email: '', alias: '',
           cvu: '', username: '', balance: 0, idAccount: ''
        };
      }
      // Fuerza la actualización de la vista
      this.cdr.detectChanges(); // <-- 3. LLAMA a detectChanges()
    });
    this.subscriptions.push(userDataSub); // Guarda la suscripción para limpiarla después

    // --- Tus otras suscripciones (se mantienen igual) ---

    // Suscribirse a las transacciones usando el service
    const recentTransactionsSub = this.transactionService.recentTransactions$.subscribe((transactions: Transaction[]) => {
      this.recentTransactions = transactions;
      // Opcional: Podrías necesitar detectChanges() aquí también si la lista no se actualiza
       this.cdr.detectChanges();
    });
    this.subscriptions.push(recentTransactionsSub);

    const allTransactionsSub = this.transactionService.allTransactions$.subscribe((transactions: Transaction[]) => {
      this.allTransactions = transactions;
       this.cdr.detectChanges();
    });
    this.subscriptions.push(allTransactionsSub);

    const displayedTransactionsSub = this.transactionService.displayedTransactions$.subscribe((transactions: Transaction[]) => {
      this.displayedTransactions = transactions;
       this.cdr.detectChanges();
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
      // Probablemente necesites detectChanges aquí también si los modales no se abren/cierran bien
      this.cdr.detectChanges();
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
    // Verificar primero en localStorage antes de hacer la llamada
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN') {
      this.utilService.showToast('No tienes permisos para acceder al panel de administración', 'error');
      return;
    }

    // Activar loading
    this.isLoading = true;

    try {
      // Solo hacer la verificación del backend si el rol local es ADMIN
      await this.adminService.checkAccess().toPromise();
      this.router.navigate(['/admin']);
    } catch (error: any) {
      console.error('Error al verificar acceso de admin:', error);
      
      // Manejar diferentes tipos de errores
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

  // Activar efecto de disminución (se mantiene igual)
  setTimeout(() => {
    this.isBalanceDecreasing = true;
  }, 7800);

  this.isTransfiriendo = true;

  let accountIdForTransfer: string;
  let accountIdNumber: number;

  try {
    // --- Obtener el ID de la cuenta destino (lógica sin cambios) ---
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

    // --- Realizar la transferencia ---
    // Espera a que la transferencia se complete
    await this.dataService.realizarTransferencia(accountIdForTransfer, this.montoTransfer);

    // V--- ¡AQUÍ ESTÁ EL CAMBIO! ---V
    // Llama a loadUserData para que actualice el Subject.
    // El .subscribe() vacío es para activar la ejecución del Observable.
    // La UI se actualizará sola porque está suscrita a userData$.
    this.dataService.loadUserData(true).subscribe();
    // ^------------------------------^

    // --- Desactivar animación roja ---
    setTimeout(() => {
      this.isBalanceDecreasing = false;
    }, 9300); // O tu valor preferido

    // --- Guardar datos y manejar favoritos (lógica sin cambios) ---
    this.transferCompletedData = { ...this.cuentaDestinoData, idaccount: accountIdNumber };
    const esFavoritoExistente = this.favoriteContacts.some(fav =>
      fav.favoriteAccount && fav.favoriteAccount.idAccount === accountIdNumber
    );

    if (esFavoritoExistente) {
      this.utilService.showToast('Transferencia realizada con éxito', 'success');
      this.closeTransferModal();
    } else {
      this.transferStep = 4;
      // this.showAddToFavoritesOption = true; // Si usas esta variable
    }

    // --- Recargar transacciones (lógica sin cambios) ---
    // Asegúrate que tu TransactionService también funcione bien (idealmente con Observables)
    await this.transactionService.loadAllTransactions(true);

  } catch (error) {
    console.error('Error realizando transferencia:', error);
    this.utilService.showToast('Error al realizar la transferencia', 'error');
    this.isBalanceDecreasing = false;
    // Intenta recargar los datos incluso si falla, por si acaso
    this.dataService.loadUserData(true).subscribe();
  } finally {
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

  cerrarModalQr(): void{
    this.isLoadingQr = false;
    this.modalService.closeModal()
  }

  openIngresarModal(): void {
    this.montoIngresar = null;
    this.isIngresandoDinero = false; // Resetear estado de carga
    this.openModal('ingresar');
  }

  closeIngresarModal(): void {
    this.closeAllModals();
    this.montoIngresar = null;
    this.isIngresandoDinero = false; // Resetear estado de carga
    this.isBalanceUpdating = false; // Resetear animación del saldo
    this.isBalanceDecreasing = false; // Resetear animación de transferencia
  }

  openTransferModal(): void {
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = null;
    this.cuentaDestinoData = null;
    this.isBuscandoCuenta = false; // Resetear estado de búsqueda
    this.isTransfiriendo = false; // Resetear estado de transferencia
    this.isBalanceDecreasing = false; // Resetear animación de transferencia
    this.isScanning = false;
    this.openModal('transfer');
  }

  closeTransferModal(): void {
    // Si la transferencia viene de un favorito, volver al modal de información del favorito
    if (this.cuentaDestinoData?.isFromFavorite && this.selectedFavoriteContact) {
      this.isScanning = false;
      this.transferStep = 1;
      this.destinatarioInput = '';
      this.montoTransfer = 0;
      this.cuentaDestinoData = null;
      this.isBuscandoCuenta = false;
      this.isTransfiriendo = false;
      this.isBalanceDecreasing = false;
      // NO limpiar selectedFavoriteContact aquí porque queremos volver al modal del favorito
      this.closeAllModals();
      this.showFavoriteDetailsModal = true;
      return;
    }
    
    // Si no viene de favorito, comportamiento normal
    this.closeAllModals();
    this.isScanning = false;
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.montoTransfer = 0;
    this.cuentaDestinoData = null;
    this.selectedFavoriteContact = null; // Limpiar favorito seleccionado
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

  openMyQrModal(): void{
    const accountId = localStorage.getItem('accountId')

    if(!accountId){
      console.error("No se encontro el ID de la cuenta en el localStorage.")
      return;
    }
    const accountIdNumber = parseInt(accountId,10)
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
  this.hasPermission = null; // Resetea el estado del permiso
}

cancelScanning(): void {
  this.isScanning = false;
}

handlePermissionResponse(permission: boolean): void {
  this.hasPermission = permission;
  if (!permission) {
    this.utilService.showToast('Permiso de cámara denegado', 'error');
    this.isScanning = false; // Vuelve al input si se niega
  }
}

handleScanError(error: Error): void {
  console.error("Error con el escáner:", error);
  this.utilService.showToast('Error al iniciar la cámara', 'error');
}

handleScanSuccess(resultString: string): void {
  this.isScanning = false; // Oculta la cámara
  this.isBuscandoCuenta = true; // Muestra el spinner "Buscando..."

  setTimeout(() => { // Simula verificación
    try {
      const qrData = JSON.parse(resultString);

      if (qrData && qrData.walletApp === 'ArCashV1') {
        const currentUser = this.dataService.getCurrentUserData();
        // Convertimos ambos a número para comparar
        if (currentUser && parseInt(currentUser.idAccount) === qrData.accountId) {
          this.utilService.showToast('No puedes transferir a tu misma cuenta', 'error');
          this.isBuscandoCuenta = false;
          return;
        }

        // Rellenamos los datos para el Paso 2
        this.cuentaDestinoData = {
          alias: qrData.accountAlias,
          // El CVU no viene en tu QR, ponemos placeholder
          cvu: 'Obtenido por QR', 
          user: {
            nombre: qrData.receiverName.split(' ')[0],
            apellido: qrData.receiverName.split(' ').slice(1).join(' '),
            dni: qrData.dni,
            email: qrData.email
          },
          idaccount: qrData.accountId // Guardamos el ID numérico
        };
        this.transferStep = 2; // Saltamos al Paso 2 (Confirmar)
      } else {
        throw new Error('QR no válido para ArCash');
      }
    } catch (error) {
      console.error("Error al procesar QR:", error);
      this.utilService.showToast('El código QR no es válido', 'error');
    } finally {
      this.isBuscandoCuenta = false; // Oculta el spinner
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

  backToFavoritesList(): void {
    // Cerrar modal de detalles y volver a mostrar la lista de favoritos
    this.showFavoriteDetailsModal = false;
    this.selectedFavoriteContact = null;
    this.favoriteService.clearSelectedFavorite();
    this.showFavoritesModal = true;
  }

  async transferToFavorite(favorite: any): Promise<void> {
    // Configurar datos de transferencia usando el service
    this.cuentaDestinoData = this.favoriteService.createTransferDataFromFavorite(favorite);
    this.selectedFavoriteContact = favorite; // Guardar el favorito seleccionado
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
          this.utilService.showToast('Error: No se pudo obtener el ID de cuenta', 'error');
          return;
        }
      } catch (error) {
        this.utilService.showToast('Error al buscar información de la cuenta', 'error');
        return;
      }
    } else {
      // Los datos vienen de una búsqueda normal, convertir directamente
      accountId = parseInt(this.transferCompletedData.idaccount.toString());
      
      if (isNaN(accountId)) {
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
    // Si la transferencia viene de un favorito, volver al modal de información del favorito
    if (this.cuentaDestinoData?.isFromFavorite && this.selectedFavoriteContact) {
      this.transferStep = 1;
      this.destinatarioInput = '';
      this.cuentaDestinoData = null;
      this.isScanning = false;
      // NO limpiar selectedFavoriteContact aquí porque queremos volver al modal del favorito
      this.closeAllModals();
      this.showFavoriteDetailsModal = true;
      return;
    }
    
    // Si no viene de favorito, comportamiento normal
    this.transferStep = 1;
    this.destinatarioInput = '';
    this.cuentaDestinoData = null;
    this.selectedFavoriteContact = null; // Limpiar favorito seleccionado
    this.isScanning = false;
  }
  volverAConfirmacion(): void {
    // Si la transferencia viene de un favorito, volver al modal de información del favorito
    if (this.cuentaDestinoData?.isFromFavorite && this.selectedFavoriteContact) {
      this.transferStep = 2; // Resetear el step
      this.montoTransfer = null; // Resetea el monto
      this.closeAllModals();
      this.showFavoriteDetailsModal = true;
      return;
    }
    
    // Si no viene de favorito, comportamiento normal
    this.transferStep = 2; // Vuelve al paso de confirmar datos
    this.montoTransfer = null; // Resetea el monto
  }

  volverBusqueda(): void { // Este método ya no se usa directamente desde el paso 3
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
    // Activar loading como en el login
    this.isLoading = true;
    
    // Obtener el token JWT del localStorage
    const jwt = localStorage.getItem('JWT');
    
    if (!jwt) {
      // Simular un pequeño delay incluso si no hay JWT
      setTimeout(() => {
        this.performLocalLogout();
      }, 1500);
      return;
    }

    // Llamar al endpoint de logout del backend
    this.authService.logoutUser().subscribe({
      next: (response) => {
        // Simular un delay mínimo para mostrar el loading
        setTimeout(() => {
          this.performLocalLogout();
        }, 1500);
      },
      error: (error) => {
        // Aunque falle el backend, limpiar la sesión local después del delay
        setTimeout(() => {
          this.performLocalLogout();
        }, 1500);
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
    
    // Desactivar loading como en el login
    this.isLoading = false;
    
    // Redireccionar al login
    this.router.navigate(['/login'], {replaceUrl: true});
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

  // Método para formatear números de manera más legible
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
    // Usar índice + timestamp para garantizar unicidad
    return `${index}_${favorite.id}_${favorite.contactAlias}_${Date.now()}`;
  }

  // Método para formatear números estilo MercadoPago
  formatMoney(value: number): string {
    if (value == null || isNaN(value)) return '0';
    
    // Si es un número entero, no mostrar decimales
    if (value % 1 === 0) {
      return value.toLocaleString('es-AR');
    }
    
    // Si tiene decimales, mostrar máximo 2 decimales pero sin ceros innecesarios
    const formatted = value.toLocaleString('es-AR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
    
    return formatted;
  }

}
