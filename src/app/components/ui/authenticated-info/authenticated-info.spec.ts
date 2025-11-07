import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthenticatedInfo } from './authenticated-info';

describe('AuthenticatedInfo', () => {
  let component: AuthenticatedInfo;
  let fixture: ComponentFixture<AuthenticatedInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthenticatedInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
