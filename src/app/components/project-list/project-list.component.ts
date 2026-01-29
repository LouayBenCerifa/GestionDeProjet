import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
  imports: [CommonModule, DatePipe, TitleCasePipe, ProgressBarComponent],
})
export class ProjectListComponent {
  @Input() projects: any[] = [];
}
