import { Injectable } from '@angular/core';
import { CacheData, CacheConfig, CacheValidation } from '../../models/cache.interface';

@Injectable({
  providedIn: 'root'
})
export class CacheService {

  /**
   * Guarda datos en localStorage con timestamp de expiración
   */
  setCache<T>(config: CacheConfig, data: T): void {
    try {
      const expiry = Date.now() + config.duration;
      localStorage.setItem(config.key, JSON.stringify(data));
      localStorage.setItem(config.expiryKey, expiry.toString());
    } catch (error) {
      console.warn(`Error guardando cache ${config.key}:`, error);
    }
  }

  /**
   * Obtiene datos del cache si son válidos
   */
  getCache<T>(config: CacheConfig): T | null {
    try {
      const validation = this.validateCache(config);
    
      if (!validation.isValid) {
        if (validation.hasCache) {
          this.clearCache(config);
         
        }
        return null;
      }

      const cached = localStorage.getItem(config.key);
      if (cached) {
        const data = JSON.parse(cached);
      
        return data;
      }
    } catch (error) {

      this.clearCache(config);
    }
    return null;
  }

  /**
   * Valida si el cache existe y no ha expirado
   */
  private validateCache(config: CacheConfig): CacheValidation {
    const cached = localStorage.getItem(config.key);
    const expiry = localStorage.getItem(config.expiryKey);
    
    const validation: CacheValidation = {
      hasCache: !!cached,
      hasExpiry: !!expiry,
      isValid: false,
      timestamp: Date.now(),
      expiry: expiry ? parseInt(expiry) : undefined
    };

    if (validation.hasCache && validation.hasExpiry && validation.expiry && validation.timestamp) {
      validation.isValid = validation.timestamp <= validation.expiry;
    }

    return validation;
  }

  /**
   * Limpia cache específico
   */
  clearCache(config: CacheConfig): void {
    localStorage.removeItem(config.key);
    localStorage.removeItem(config.expiryKey);
  }

  /**
   * Limpia todos los caches que coincidan con un prefijo
   */
  clearCachesByPrefix(prefix: string): number {
    const keys = Object.keys(localStorage);
    const matchingKeys = keys.filter(key => key.startsWith(prefix));
    
    matchingKeys.forEach(key => localStorage.removeItem(key));
    
    return matchingKeys.length;
  }

  /**
   * Limpia todos los cachés de ArCash
   */
  clearAllArCashCaches(): number {
    return this.clearCachesByPrefix('arcash_');
  }
}
