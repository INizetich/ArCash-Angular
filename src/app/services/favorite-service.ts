import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DataService } from './data-service';
import { UtilService } from './util-service';
import { CacheService } from './cache.service';
import { CacheConfig } from '../models/cache.interface';
import { TransferData } from '../models/transfer.interface';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private favoriteContactsSubject = new BehaviorSubject<any[]>([]);
  public favoriteContacts$ = this.favoriteContactsSubject.asObservable();

  private selectedFavoriteSubject = new BehaviorSubject<any | null>(null);
  public selectedFavorite$ = this.selectedFavoriteSubject.asObservable();

  private readonly cacheConfig: CacheConfig = {
    key: 'arcash_favorites_cache',
    expiryKey: 'arcash_favorites_cache_expiry',
    duration: 5 * 60 * 1000 // 5 minutos
  };

  constructor(
    private dataService: DataService,
    private utilService: UtilService,
    private cacheService: CacheService
  ) {}

  async loadFavoriteContacts(forceReload: boolean = false): Promise<void> {
    try {
      // Verificar si tenemos datos en caché válidos (solo si no forzamos recarga)
      if (!forceReload) {
        const cachedData = this.cacheService.getCache<any[]>(this.cacheConfig);
        if (cachedData) {
          this.favoriteContactsSubject.next(cachedData);
          return;
        }
      }

      const favorites = await this.dataService.getFavoriteContacts();
      
      // Guardar en caché después de cargar desde servidor
      this.cacheService.setCache(this.cacheConfig, favorites);
      
      this.favoriteContactsSubject.next(favorites);
    } catch (error) {
      console.error('Error cargando contactos favoritos:', error);
      this.utilService.showToast('Error al cargar contactos favoritos', 'error');
      throw error;
    }
  }

  async loadFavoriteContactsOrdered(): Promise<void> {
    try {
      const favorites = await this.dataService.getFavoriteContactsOrderedByUsage();
      this.favoriteContactsSubject.next(favorites);
    } catch (error) {
      console.error('Error cargando contactos favoritos ordenados:', error);
      this.utilService.showToast('Error al cargar contactos favoritos', 'error');
      throw error;
    }
  }

  getFavoriteContacts(): any[] {
    return this.favoriteContactsSubject.value;
  }

  selectFavorite(favorite: any): void {
    this.selectedFavoriteSubject.next(favorite);
  }

  getSelectedFavorite(): any | null {
    return this.selectedFavoriteSubject.value;
  }

  clearSelectedFavorite(): void {
    this.selectedFavoriteSubject.next(null);
  }

  async addFavoriteContact(accountId: number, alias: string, description?: string): Promise<boolean> {
    try {
      const success = await this.dataService.addFavoriteContact(accountId, alias, description);
      
      if (success) {
        this.utilService.showToast('Contacto agregado a favoritos', 'success');
        // Forzar recarga desde servidor para actualizar el caché
        await this.loadFavoriteContacts(true);
        return true;
      } else {
        // El backend retornó false, pero no se lanzó excepción
        // Esto significa que alguna validación falló en el backend
        console.error('Backend validation failed - possible reasons:');
        console.error('1. User does not exist');
        console.error('2. Account does not exist'); 
        console.error('3. User trying to add themselves');
        console.error('4. Relationship already exists');
        this.utilService.showToast('No se pudo agregar el contacto. Verifica que no sea tu propia cuenta o que ya esté en favoritos.', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Error agregando a favoritos:', error);
      
      // Proporcionar mensajes más específicos según el tipo de error
      let errorMessage = 'Error al agregar contacto a favoritos';
      
      if (error.status === 400) {
        // Verificar si hay un mensaje específico del backend
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else {
          errorMessage = 'Datos inválidos. Verifica que el contacto no esté ya en favoritos o que el ID de cuenta sea válido.';
        }
      } else if (error.status === 401) {
        errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
      } else if (error.status === 404) {
        errorMessage = 'Cuenta no encontrada.';
      } else if (error.status === 500) {
        errorMessage = 'Error del servidor. Intenta nuevamente.';
      }
      
      this.utilService.showToast(errorMessage, 'error');
      return false;
    }
  }

  async updateFavoriteContact(id: number, alias: string, description?: string): Promise<boolean> {
    try {
      const success = await this.dataService.updateFavoriteContact(id, alias, description);
      
      if (success) {
        this.utilService.showToast('Contacto actualizado correctamente', 'success');
        // Forzar recarga desde servidor para actualizar el caché
        await this.loadFavoriteContacts(true);
        return true;
      } else {
        this.utilService.showToast('Error al actualizar contacto', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error actualizando contacto:', error);
      this.utilService.showToast('Error al actualizar contacto', 'error');
      return false;
    }
  }

  async removeFavoriteContact(id: number, contactName: string): Promise<boolean> {
    if (confirm(`¿Estás seguro de que quieres eliminar a "${contactName}" de tus favoritos?`)) {
      try {
        const success = await this.dataService.removeFavoriteContact(id);
        
        if (success) {
          this.utilService.showToast('Contacto eliminado de favoritos', 'success');
          // Forzar recarga desde servidor para actualizar el caché
          await this.loadFavoriteContacts(true);
          return true;
        } else {
          this.utilService.showToast('Error al eliminar contacto', 'error');
          return false;
        }
      } catch (error) {
        console.error('Error eliminando contacto favorito:', error);
        this.utilService.showToast('Error al eliminar contacto', 'error');
        return false;
      }
    }
    return false;
  }

  // Método para invalidar caché manualmente
  invalidateCache(): void {
    this.cacheService.clearCache(this.cacheConfig);
  }

  createTransferDataFromFavorite(favorite: any): TransferData {
    // Según el backend, el favorito tiene:
    // - id (del favorito)
    // - accountCbu (CBU de la cuenta favorita)
    // - accountAlias (alias de la cuenta favorita)
    // - accountOwnerName (nombre del dueño)
    // Pero NO tiene el ID numérico de la cuenta directamente
    
    return {
      // IMPORTANTE: Para favoritos, NO tenemos el ID numérico de cuenta
      // Solo tenemos el CBU, por eso necesitamos una estrategia diferente
      idaccount: favorite.accountCbu, // Este es el CBU, no el ID numérico
      alias: favorite.accountAlias,
      cvu: favorite.accountCbu,
      user: {
        nombre: favorite.accountOwnerName.split(' ')[0] || 'Usuario',
        apellido: favorite.accountOwnerName.split(' ').slice(1).join(' ') || '',
        dni: ''
      },
      // Agregar una bandera para identificar que viene de favoritos
      isFromFavorite: true,
      favoriteId: favorite.id
    };
  }
}
