import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  
  constructor(
    private route: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  goBack() {
    this.route.navigate([""])
  }

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    if (!isPlatformBrowser(this.platformId)) return;

    // Crear el contenedor de toast si no existe
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    // Crear el toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Crear el contenido del toast
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">
          ${this.getToastIcon(type)}
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="toast-progress"></div>
    `;

    // Agregar estilos dinámicos si no existen
    this.addToastStyles();

    // Agregar el toast al contenedor
    toastContainer.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 100);

    // Animar la barra de progreso
    const progressBar = toast.querySelector('.toast-progress') as HTMLElement;
    if (progressBar) {
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 200);
    }

    // Auto-remover después de 4 segundos
    setTimeout(() => {
      this.removeToast(toast);
    }, 4000);
  }

  private getToastIcon(type: string): string {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
               <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
               <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
             </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>`
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  private removeToast(toast: HTMLElement) {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }

  private addToastStyles() {
    if (document.getElementById('toast-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
      .toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column-reverse;
        gap: 12px;
        pointer-events: none;
      }

      .toast {
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        min-width: 320px;
        max-width: 400px;
        overflow: hidden;
        transform: translateY(100%) translateX(20px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.320, 1);
        pointer-events: auto;
        position: relative;
      }

      /* Modo oscuro - fondo oscuro */
      [data-theme="dark"] .toast {
        background: rgba(0, 0, 0, 0.8);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 
          0 20px 40px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.05);
      }

      /* Modo claro - fondo claro */
      .toast {
        background: rgba(255, 255, 255, 0.9);
        border-color: rgba(0, 0, 0, 0.1);
        box-shadow: 
          0 20px 40px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(0, 0, 0, 0.05);
      }

      .toast-show {
        transform: translateY(0) translateX(0);
        opacity: 1;
      }

      .toast-hide {
        transform: translateY(100%) translateX(20px);
        opacity: 0;
      }

      .toast-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        position: relative;
        z-index: 2;
      }

      .toast-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .toast-message {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
      }

      /* Texto para modo oscuro */
      [data-theme="dark"] .toast-message {
        color: white;
      }

      /* Texto para modo claro */
      .toast-message {
        color: #2c3e50;
      }

      .toast-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Botón cerrar para modo oscuro */
      [data-theme="dark"] .toast-close {
        color: rgba(255, 255, 255, 0.6);
      }

      [data-theme="dark"] .toast-close:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.1);
      }

      /* Botón cerrar para modo claro */
      .toast-close {
        color: rgba(44, 62, 80, 0.6);
      }

      .toast-close:hover {
        color: #2c3e50;
        background: rgba(0, 0, 0, 0.1);
        transform: scale(1.1);
      }

      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        width: 100%;
        transition: width 4s linear;
        z-index: 1;
      }

      /* Tipos de toast - MODO OSCURO */
      [data-theme="dark"] .toast-success {
        border-color: var(--verde-neon);
        background: rgba(0, 255, 157, 0.1);
      }

      [data-theme="dark"] .toast-success .toast-icon {
        color: var(--verde-neon);
      }

      [data-theme="dark"] .toast-success .toast-progress {
        background: linear-gradient(90deg, var(--verde-neon), var(--cyan-electrico));
      }

      [data-theme="dark"] .toast-error {
        border-color: var(--rosa-plasma);
        background: rgba(255, 20, 147, 0.1);
      }

      [data-theme="dark"] .toast-error .toast-icon {
        color: var(--rosa-plasma);
      }

      [data-theme="dark"] .toast-error .toast-progress {
        background: linear-gradient(90deg, var(--rosa-plasma), #ff4757);
      }

      [data-theme="dark"] .toast-info {
        border-color: var(--cyan-electrico);
        background: rgba(0, 255, 255, 0.1);
      }

      [data-theme="dark"] .toast-info .toast-icon {
        color: var(--cyan-electrico);
      }

      [data-theme="dark"] .toast-info .toast-progress {
        background: linear-gradient(90deg, var(--cyan-electrico), var(--azul-cyber));
      }

      [data-theme="dark"] .toast-warning {
        border-color: var(--amarillo-tech);
        background: rgba(255, 215, 0, 0.1);
      }

      [data-theme="dark"] .toast-warning .toast-icon {
        color: var(--amarillo-tech);
      }

      [data-theme="dark"] .toast-warning .toast-progress {
        background: linear-gradient(90deg, var(--amarillo-tech), #ffa502);
      }

      /* Tipos de toast - MODO CLARO */
      .toast-success {
        border-color: #27ae60;
        background: rgba(39, 174, 96, 0.15);
      }

      .toast-success .toast-icon {
        color: #27ae60;
      }

      .toast-success .toast-progress {
        background: linear-gradient(90deg, #27ae60, #2ecc71);
      }

      .toast-error {
        border-color: #e74c3c;
        background: rgba(231, 76, 60, 0.15);
      }

      .toast-error .toast-icon {
        color: #e74c3c;
      }

      .toast-error .toast-progress {
        background: linear-gradient(90deg, #e74c3c, #c0392b);
      }

      .toast-info {
        border-color: #3498db;
        background: rgba(52, 152, 219, 0.15);
      }

      .toast-info .toast-icon {
        color: #3498db;
      }

      .toast-info .toast-progress {
        background: linear-gradient(90deg, #3498db, #2980b9);
      }

      .toast-warning {
        border-color: #f39c12;
        background: rgba(243, 156, 18, 0.15);
      }

      .toast-warning .toast-icon {
        color: #f39c12;
      }

      .toast-warning .toast-progress {
        background: linear-gradient(90deg, #f39c12, #e67e22);
      }

      /* Efectos adicionales */
      .toast::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1), transparent 70%);
        pointer-events: none;
        z-index: 1;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .toast-container {
          left: 20px;
          right: 20px;
          bottom: 20px;
        }

        .toast {
          min-width: auto;
          max-width: none;
        }
      }

      /* Animación de entrada escalonada para múltiples toasts */
      .toast:nth-child(1) { animation-delay: 0ms; }
      .toast:nth-child(2) { animation-delay: 100ms; }
      .toast:nth-child(3) { animation-delay: 200ms; }
      .toast:nth-child(4) { animation-delay: 300ms; }
    `;

    document.head.appendChild(styles);
  }
}
