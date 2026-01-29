import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  imports: [CommonModule, FormsModule, DatePipe]
})
export class ChatComponent {
  @Input() messages: any[] = [];
  @Input() currentUserId: string = '';
  messageText: string = '';
  sendMessage() {
    // Implement send message logic
  }
}
