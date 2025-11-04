import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ResendNavigationService } from './resend-navigation.service';

describe('ResendNavigationService', () => {
  let service: ResendNavigationService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    });
    
    service = TestBed.inject(ResendNavigationService);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    // Limpiar sessionStorage antes de cada test
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should navigate from validation with correct state', () => {
    service.navigateFromValidation();

    expect(sessionStorage.getItem('resendAccess')).toBe('true');
    expect(router.navigate).toHaveBeenCalledWith(['/resend'], {
      state: {
        allowResendAccess: true,
        from: 'validation'
      }
    });
  });

  it('should navigate from login with correct state', () => {
    service.navigateFromLogin();

    expect(sessionStorage.getItem('resendAccess')).toBe('true');
    expect(router.navigate).toHaveBeenCalledWith(['/resend'], {
      state: {
        allowResendAccess: true,
        from: 'login'
      }
    });
  });

  it('should navigate from register with correct state', () => {
    service.navigateFromRegister();

    expect(sessionStorage.getItem('resendAccess')).toBe('true');
    expect(router.navigate).toHaveBeenCalledWith(['/resend'], {
      state: {
        allowResendAccess: true,
        from: 'register'
      }
    });
  });

  it('should navigate from forgot password with correct state', () => {
    service.navigateFromForgotPassword();

    expect(sessionStorage.getItem('resendAccess')).toBe('true');
    expect(router.navigate).toHaveBeenCalledWith(['/resend'], {
      state: {
        allowResendAccess: true,
        from: 'forgot-password'
      }
    });
  });

  it('should check if resend access is allowed', () => {
    expect(service.isResendAccessAllowed()).toBe(false);
    
    sessionStorage.setItem('resendAccess', 'true');
    expect(service.isResendAccessAllowed()).toBe(true);
  });

  it('should clear resend access', () => {
    sessionStorage.setItem('resendAccess', 'true');
    expect(service.isResendAccessAllowed()).toBe(true);
    
    service.clearResendAccess();
    expect(service.isResendAccessAllowed()).toBe(false);
  });
});
