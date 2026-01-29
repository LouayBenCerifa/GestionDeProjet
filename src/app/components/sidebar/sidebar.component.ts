import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() userName: string = '';
  @Input() userAvatarUrl: string = '';
  logout() {
    // Implement logout logic
  }
}
