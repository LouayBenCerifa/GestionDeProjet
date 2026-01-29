import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  imports: [CommonModule, DatePipe]
})
export class TaskListComponent {
  @Input() tasks: any[] = [];
  @Output() toggleTask = new EventEmitter<any>();
  @Output() deleteTask = new EventEmitter<string>();
}
