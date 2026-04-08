import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-dashboard-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="stats-grid dashboard-metrics-grid">
          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">task_alt</span>
              <h3>My Tasks</h3>
            </div>
            <p class="stat-value">{{ c.getDashboardStats().totalTasks }}</p>
            <p class="stat-label">Pending: {{ c.getDashboardStats().totalTasks - c.getDashboardStats().completedTasks }}</p>
          </div>

          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">trending_up</span>
              <h3>Completion Rate</h3>
            </div>
            <p class="stat-value">{{ c.getDashboardStats().taskCompletionRate.toFixed(1) }}%</p>
            <p class="stat-label">{{ c.getDashboardStats().completedTasks }}/{{ c.getDashboardStats().totalTasks }} tasks</p>
          </div>

          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">folder</span>
              <h3>Active Projects</h3>
            </div>
            <p class="stat-value">{{ c.getDashboardStats().activeProjects }}</p>
            <p class="stat-label">Assigned to me</p>
          </div>

          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">schedule</span>
              <h3>Overdue Tasks</h3>
            </div>
            <p class="stat-value">{{ c.getDashboardStats().overdueTasks }}</p>
            <p class="stat-label">Need attention</p>
          </div>
        </div>

        <div class="section dashboard-section-card">
          <div class="section-header">
            <h2>Recent Tasks</h2>
            <button class="btn btn-secondary" (click)="c.viewAllTasks()">View All</button>
          </div>
          <div class="tasks-list">
            @if (c.recentTasks().length > 0) {
              @for (task of c.recentTasks(); track task.id) {
                <div class="task-card" [class.overdue]="c.isTaskOverdue(task)">
                  <div class="task-headline">
                    <div class="task-title-wrap">
                      <span class="material-symbols-rounded app-icon">assignment</span>
                      <div>
                        <h3>{{ task.title }}</h3>
                        <p class="task-subtitle">Project: {{ c.getProjectName(task.projectId) }}</p>
                      </div>
                    </div>
                    <div class="task-status-badges">
                      <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                      <span class="status-badge" [class]="'status-' + task.status">{{ task.status | titlecase }}</span>
                    </div>
                  </div>
                  <p class="task-description">{{ task.description }}</p>
                  <div class="task-meta">
                    <span class="meta-chip">
                      <span class="material-symbols-rounded">event</span>
                      Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}
                    </span>
                    @if (c.isTaskOverdue(task)) {
                      <span class="meta-chip overdue-label">
                        <span class="material-symbols-rounded">warning</span>
                        OVERDUE
                      </span>
                    }
                  </div>
                  <div class="progress-section">
                    <div class="progress-track">
                      <div class="progress-fill" [style.width.%]="task.completionPercentage"></div>
                    </div>
                    <p class="progress-subtitle">{{ task.completionPercentage }}% complete</p>
                  </div>
                  <div class="task-actions">
                    <button class="btn-small" (click)="c.updateTaskProgress(task)">Update Progress</button>
                    <button class="btn-small" (click)="c.addComment(task)">Add Comment</button>
                  </div>
                </div>
              }
            } @else {
              <div class="empty-state">
                <p>No tasks assigned yet</p>
              </div>
            }
          </div>
        </div>
      </section>
    }
  `
})
export class AppEmployeeDashboardTabComponent {
  @Input() ctx: any;
}
