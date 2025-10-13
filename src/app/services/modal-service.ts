import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModalState {
  currentModal: string | null;
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalState = new BehaviorSubject<ModalState>({
    currentModal: null,
    isLoading: false
  });

  public modalState$ = this.modalState.asObservable();

  constructor() {}

  openModal(modalType: string): void {
    this.modalState.next({
      currentModal: modalType,
      isLoading: false
    });
  }

  closeModal(): void {
    this.modalState.next({
      currentModal: null,
      isLoading: false
    });
  }

  getCurrentModal(): string | null {
    return this.modalState.value.currentModal;
  }

  isModalOpen(): boolean {
    return this.modalState.value.currentModal !== null;
  }

  setLoading(loading: boolean): void {
    const current = this.modalState.value;
    this.modalState.next({
      ...current,
      isLoading: loading
    });
  }
}
