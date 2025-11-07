import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserResponse } from '../../../models/admin.interface';

@Component({
  selector: 'app-authenticated-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './authenticated-info.html',
  styleUrls: ['./authenticated-info.css'],
  changeDetection: ChangeDetectionStrategy.OnPush // ← ESTO ES CLAVE PARA PERFORMANCE
})
export class AuthenticatedInfoComponent {
  @Input() user: UserResponse | null = null;
  @Input() showModal = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() toggleUserStatus = new EventEmitter<UserResponse>();

  // Remover ngOnChanges si no es esencial para reducir procesamiento

  onCloseModal(): void {
    this.closeModal.emit();
  }

  onToggleUserStatus(): void {
    if (this.user) {
      this.toggleUserStatus.emit(this.user);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal')) {
      this.onCloseModal();
    }
  }

  // TrackBy function para optimizar *ngFor si llegas a usar listas
  trackByUserId(index: number, user: UserResponse): number {
    return user.id;
  }
}