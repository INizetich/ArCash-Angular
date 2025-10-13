import { Injectable } from '@angular/core';
import { DeviceInfo } from '../models/common.interface';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  private deviceInfo: DeviceInfo | null = null;

  /**
   * Detecta información del dispositivo
   */
  getDeviceInfo(): DeviceInfo {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    const cores = navigator.hardwareConcurrency || 1;
    const memory = (navigator as any).deviceMemory || undefined;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowPower = cores <= 2 || memory <= 2 || isMobile;

    this.deviceInfo = {
      isLowPower,
      cores,
      memory,
      isMobile
    };

    return this.deviceInfo;
  }

  /**
   * Configura optimizaciones para dispositivos de baja potencia
   */
  configurePerformanceOptimizations(): void {
    const device = this.getDeviceInfo();
    
    if (device.isLowPower) {
      // Añadir clase para reducir animaciones
      document.body.classList.add('reduce-motion');
      
      // Reducir velocidad de animaciones
      document.documentElement.style.setProperty('--animation-speed', '0.1s');
      
      console.log('⚡ Optimizaciones de rendimiento aplicadas para dispositivo de baja potencia');
    }
  }

  /**
   * Verifica si el dispositivo es móvil
   */
  isMobileDevice(): boolean {
    return this.getDeviceInfo().isMobile;
  }

  /**
   * Verifica si es un dispositivo de baja potencia
   */
  isLowPowerDevice(): boolean {
    return this.getDeviceInfo().isLowPower;
  }
}
