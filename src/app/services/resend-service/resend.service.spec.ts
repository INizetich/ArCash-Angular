import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ResendService, ResendResponse } from './resend.service';

describe('ResendService', () => {
  let service: ResendService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ResendService]
    });
    service = TestBed.inject(ResendService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resend validation email', () => {
    const mockResponse: ResendResponse = {
      success: true,
      message: 'Se ha enviado un nuevo enlace de validación a tu email.'
    };
    const email = 'test@example.com';

    service.resendValidationEmail(email).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`http://localhost:8080/api/resend/validation?email=${email}`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should resend password recovery', () => {
    const mockResponse: ResendResponse = {
      success: true,
      message: 'Se ha enviado un nuevo enlace de recuperación a tu email.'
    };
    const email = 'test@example.com';

    service.resendPasswordRecovery(email).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`http://localhost:8080/api/resend/password-recovery?email=${email}`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
