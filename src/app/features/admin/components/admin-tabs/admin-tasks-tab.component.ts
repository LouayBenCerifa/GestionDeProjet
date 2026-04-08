import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-tasks-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="section-header">
          <h2>Create & Assign Tasks</h2>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select class="input" style="min-width: 180px;" [ngModel]="c.selectedTaskFilter()" (ngModelChange)="c.applySavedTaskFilter($event)">
              <option value="all">All Tasks</option>
              <option value="my-overdue">My Overdue</option>
              <option value="due-this-week">Due This Week</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <button class="btn btn-primary" (click)="c.toggleCreateTaskForm()">+ New Task</button>
          </div>
        </div>

        <div class="form-card bulk-actions-card" style="margin-bottom: 16px;">
          <h3>Bulk Actions</h3>
          <div class="form-row">
            <select class="input" [(ngModel)]="c.bulkStatus">
              <option value="">Bulk Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>

            <select class="input" [(ngModel)]="c.bulkPriority">
              <option value="">Bulk Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select class="input" [(ngModel)]="c.bulkAssignee">
              <option value="">Bulk Assignee</option>
              @for (emp of c.employees(); track emp.id) {
                <option [value]="emp.id">{{ emp.name || emp.email }}</option>
              }
            </select>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" (click)="c.applyBulkUpdate()" [disabled]="c.selectedTaskIds().length === 0">Apply to {{ c.selectedTaskIds().length }} Task(s)</button>
          </div>
        </div>

        @if (c.showCreateTaskForm()) {
          <div class="form-card">
            <h3>Assign Task to Employee</h3>
            <form [formGroup]="c.taskForm" (ngSubmit)="c.createTask()" class="form">
              <select formControlName="projectId" class="input">
                <option value="">Select Project</option>
                @if (c.projects().length > 0) {
                  @for (proj of c.projects(); track proj.id) {
                    <option [value]="proj.id">{{ proj.name }}</option>
                  }
                } @else {
                  <option value="" disabled>No projects available. Create a project first.</option>
                }
              </select>

              <select formControlName="assignedTo" class="input">
                <option value="">Assign To Employee</option>
                @if (!c.taskForm.get('projectId')?.value) {
                  <option value="" disabled>Select a project first</option>
                } @else if (c.getAssignableEmployeesForSelectedProject().length > 0) {
                  @for (emp of c.getAssignableEmployeesForSelectedProject(); track emp.id) {
                    <option [value]="emp.id">{{ emp.name }} ({{ emp.email }})</option>
                  }
                } @else {
                  <option value="" disabled>No team members in this project</option>
                }
              </select>

              <input type="text" placeholder="Task Title" formControlName="title" class="input">
              <textarea placeholder="Task Description" formControlName="description" class="textarea"></textarea>

              <div class="form-row">
                <input type="date" formControlName="deadline" class="input">
                <select formControlName="priority" class="input">
                  <option value="">Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div class="form-row">
                <input type="number" placeholder="Effort Points" formControlName="effortPoints" class="input">
                <input type="number" placeholder="Estimated Hours" formControlName="estimatedHours" class="input">
              </div>

              <div class="form-row">
                <input type="text" placeholder="Reminder Offsets (minutes, comma separated)" formControlName="reminderOffsetsMinutes" class="input">
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" [disabled]="!c.taskForm.valid || c.projects().length === 0 || c.getAssignableEmployeesForSelectedProject().length === 0">Create Task</button>
                <button type="button" class="btn btn-secondary" (click)="c.toggleCreateTaskForm()">Cancel</button>
              </div>
            </form>
          </div>
        }

        <div class="tasks-list">
          @if (c.displayedTasks().length > 0) {
            @for (task of c.displayedTasks(); track task.id) {
              <div class="task-card">
                <div class="task-header">
                  <label style="display:flex; align-items:center; gap:6px; margin-right:8px;">
                    <input type="checkbox" [checked]="c.isTaskSelected(task.id)" (change)="c.toggleTaskSelection(task.id)">
                    Select
                  </label>
                  <h3>{{ task.title }}</h3>
                  <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                </div>
                <p>{{ task.description }}</p>
                <div class="task-meta">
                  <span>Assigned to: {{ c.getEmployeeName(task.assignedTo) }}</span>
                  <span>Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}</span>
                  <span>Score: {{ c.getTaskScore(task).toFixed(2) }}</span>
                  <span>Hours: {{ task.actualHours || 0 }}/{{ task.estimatedHours || 0 }}</span>
                </div>
                <div class="task-status">
                  <span class="status-badge" [class]="'status-' + task.status">{{ task.status | titlecase }}</span>
                  <span>{{ task.completionPercentage }}%</span>
                </div>
                <div class="progress-bar-container">
                  <div class="progress-bar" [style.width.%]="task.completionPercentage"></div>
                </div>
                <div class="task-actions">
                  <button class="btn-small" (click)="c.editTask(task)">Edit</button>
                  <button class="btn-small" (click)="c.openTaskActivity(task.id)">Activity</button>
                  <button class="btn-small" (click)="c.setTaskRemindersPrompt(task)">Reminders</button>
                  <button class="btn-small" (click)="c.logOneHour(task.id)">+1h</button>
                  <button class="btn-small" (click)="c.deleteTask(task.id)">Delete</button>
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">
              <p>No tasks yet. Create your first task!</p>
            </div>
          }
        </div>

        @if (c.selectedActivityTaskId()) {
          <div class="form-card" style="margin-top: 16px;">
            <h3>Task Activity ({{ c.selectedActivityTaskId() }})</h3>
            @if (c.taskActivities().length > 0) {
              <div class="notifications-list">
                @for (entry of c.taskActivities(); track entry.id) {
                  <div class="notification-item">
                    <div class="notification-content">
                      <p><strong>{{ entry.action }}</strong> by {{ entry.actorName }} ({{ entry.actorRole }})</p>
                      <small>{{ entry.createdAt | date: 'MMM dd, yyyy HH:mm' }}</small>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p>No activity yet for this task.</p>
            }
          </div>
        }
      </section>
    }
  `
})
export class AppAdminTasksTabComponent {
  @Input() ctx: any;
}
