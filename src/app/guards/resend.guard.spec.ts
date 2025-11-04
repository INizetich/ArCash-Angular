import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { resendGuard } from './resend.guard';

describe('resendGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => resendGuard(...guardParameters));

  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);
    
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    });
    
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    // Limpiar sessionStorage antes de cada test
    sessionStorage.clear();
    
    // Mock del window.history.state
    Object.defineProperty(window, 'history', {
      value: {
        state: { navigationId: 1 }
      },
      writable: true
    });
    
    // Mock del document.referrer
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow access with valid sessionStorage flag', () => {
    sessionStorage.setItem('resendAccess', 'true');
    router.getCurrentNavigation.and.returnValue(null);
    
    const result = executeGuard({} as any, {} as any);
    
    expect(result).toBe(true);
    expect(sessionStorage.getItem('resendAccess')).toBeNull();
  });

  it('should allow access with valid referrer', () => {
    Object.defineProperty(document, 'referrer', {
      value: 'http://localhost:4200/login',
      writable: true
    });
    router.getCurrentNavigation.and.returnValue(null);
    
    const result = executeGuard({} as any, {} as any);
    
    expect(result).toBe(true);
  });

  it('should allow access with internal navigation', () => {
    Object.defineProperty(window, 'history', {
      value: {
        state: { navigationId: 5 }
      },
      writable: true
    });
    router.getCurrentNavigation.and.returnValue({ previousNavigation: {} } as any);
    
    const result = executeGuard({} as any, {} as any);
    
    expect(result).toBe(true);
  });

  it('should block direct URL access and redirect to home', () => {
    router.getCurrentNavigation.and.returnValue(null);
    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com',
      writable: true
    });
    Object.defineProperty(window, 'history', {
      value: {
        state: { navigationId: 1 }
      },
      writable: true
    });
    
    const result = executeGuard({} as any, {} as any);
    
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
