import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './password-field.html',
  styleUrls: ['./password-field.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordFieldComponent),
      multi: true
    }
  ]
})
export class PasswordFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() control?: AbstractControl | null;
  @Input() errorMessages: { [key: string]: string } = {};

  value = '';
  disabled = false;
  showPassword = false;

  onChange = (value: string) => {};
  onTouched = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getErrorMessage(): string {
    if (!this.control || !this.control.errors || !this.control.touched) {
      return '';
    }

    const errors = this.control.errors;
    const errorKeys = Object.keys(errors);
    
    if (errorKeys.length === 0) {
      return '';
    }

    const firstErrorKey = errorKeys[0];
    return this.errorMessages[firstErrorKey] || `Error: ${firstErrorKey}`;
  }

  hasError(): boolean {
    return !!(this.control && this.control.invalid && this.control.touched);
  }
}
