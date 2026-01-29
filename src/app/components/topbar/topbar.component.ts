import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NotificationComponent } from '../notification/notification.component';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  imports: [CommonModule, NotificationComponent]
})
export class TopbarComponent {
  @Input() pageTitle: string = '';
  @Input() userAvatarUrl: string = '';
}
