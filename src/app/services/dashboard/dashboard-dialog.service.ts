import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class DashboardDialogService {
  async showAlert(
    message: string,
    icon: 'success' | 'error' | 'info' = 'info',
    title = 'Notification'
  ): Promise<void> {
    await Swal.fire({
      title,
      text: message,
      icon,
      confirmButtonText: 'OK'
    });
  }

  async showConfirm(message: string, title = 'Please Confirm'): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel'
    });

    return result.isConfirmed;
  }

  async showTextInput(
    title: string,
    label: string,
    currentValue = '',
    inputType: 'text' | 'textarea' = 'text'
  ): Promise<string | null> {
    const result = await Swal.fire({
      title,
      input: inputType,
      inputLabel: label,
      inputValue: currentValue,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return null;
    }

    return String(result.value ?? '').trim();
  }
}
