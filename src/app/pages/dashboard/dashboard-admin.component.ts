import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { CardComponent } from '../../components/card/card.component';
import { ProjectListComponent } from '../../components/project-list/project-list.component';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { ChatComponent } from '../../components/chat/chat.component';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    TopbarComponent,
    CardComponent,
    ProjectListComponent,
    TaskListComponent,
    ChatComponent
  ],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent {}
