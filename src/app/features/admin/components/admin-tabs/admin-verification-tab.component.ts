import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-verification-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="section-header">
          <h2>Verification Queue</h2>
          <div class="filter-controls">
            <select class="input" [ngModel]="c.verificationProjectFilter()" (ngModelChange)="c.verificationProjectFilter.set($event)">
              <option value="all">All Projects</option>
              @for (project of c.projects(); track project.id) {
                <option [value]="project.id">{{ project.name }}</option>
              }
            </select>
            <select class="input" [ngModel]="c.verificationPriorityFilter()" (ngModelChange)="c.verificationPriorityFilter.set($event)">
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select class="input" [ngModel]="c.verificationSortBy()" (ngModelChange)="c.verificationSortBy.set($event)">
              <option value="newest">Newest Submission</option>
              <option value="oldest">Oldest Submission</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        <div class="tasks-list">
          @if (c.verificationQueueTasks().length > 0) {
            @for (task of c.verificationQueueTasks(); track task.id) {
              <div class="task-card verification-task-card">
                <div class="task-header">
                  <h3>{{ task.title }}</h3>
                  <div class="task-status-badges">
                    <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                    <span class="status-badge status-pending-approval">Pending Approval</span>
                  </div>
                </div>
                <div class="task-meta">
                  <span>Project: {{ c.getProjectName(task.projectId) }}</span>
                  <span>Employee: {{ c.getEmployeeName(task.assignedTo) }}</span>
                  <span>Submitted: {{ task.verification?.submittedAt | date: 'MMM dd, yyyy HH:mm' }}</span>
                  <span>Time Spent: {{ task.verification?.timeSpent || 0 }}h</span>
                </div>
                <p class="task-description">{{ task.verification?.completionNotes || 'No completion notes provided.' }}</p>
                @if (task.verification?.evidence && task.verification!.evidence.length > 0) {
                  <div class="task-meta">
                    <span class="meta-chip"><span class="material-symbols-rounded">attach_file</span>Evidence: {{ task.verification!.evidence.length }}</span>
                  </div>
                }
                <div class="task-actions">
                  <button class="btn-small" (click)="c.reviewVerificationTask(task)">Review Submission</button>
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">
              <p>No tasks pending approval.</p>
            </div>
          }
        </div>
      </section>
    }
  `
})
export class AppAdminVerificationTabComponent {
  @Input() ctx: any;
}
