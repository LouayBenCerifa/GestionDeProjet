import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent {}

if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    void Swal.fire({
      title: 'Notification',
      text: String(message ?? ''),
      icon: 'info',
      confirmButtonText: 'OK'
    });
  };
}