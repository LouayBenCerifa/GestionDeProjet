import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-tasks-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="section-header">
          <h2>My Tasks</h2>
          <div class="filter-controls">
            @if (c.selectedTaskProjectId) {
              <button class="btn btn-secondary" (click)="c.clearProjectTaskScope()">
                Project: {{ c.getProjectName(c.selectedTaskProjectId) }} ✕
              </button>
            }
            <select class="input" [(ngModel)]="c.taskFilter" (change)="c.filterTasks()">
              <option value="all">All Tasks</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="pending-approval">Pending Approval</option>
              <option value="done">Done</option>
              <option value="overdue">Overdue</option>
              <option value="high">High Priority</option>
              <option value="due-this-week">Due This Week</option>
            </select>
            <select class="input" [(ngModel)]="c.taskSort" (change)="c.sortTasks()">
              <option value="deadline">Sort by Deadline</option>
              <option value="priority">Sort by Priority</option>
              <option value="status">Sort by Status</option>
              <option value="project">Sort by Project</option>
              <option value="score">Sort by Score</option>
            </select>
          </div>
        </div>

        <div class="tasks-list">
          @if (c.filteredTasks().length > 0) {
            @for (task of c.filteredTasks(); track task.id) {
              <div class="task-card" [class.overdue]="c.isTaskOverdue(task)">
                <div class="task-header">
                  <h3>{{ task.title }}</h3>
                  <div class="task-status-badges">
                    <span class="priority-badge" [class]="'priority-' + task.priority">{{ task.priority | uppercase }}</span>
                    <span class="status-badge" [class]="'status-' + task.status">{{ task.status | titlecase }}</span>
                  </div>
                </div>
                <p class="task-description">{{ task.description }}</p>
                <div class="task-meta">
                  <span>Project: {{ c.getProjectName(task.projectId) }}</span>
                  <span>Assigned by: {{ c.getAdminName(task.assignedBy) }}</span>
                  <span>Deadline: {{ task.deadline | date: 'MMM dd, yyyy' }}</span>
                  <span>Score: {{ c.getTaskScore(task).toFixed(2) }}</span>
                  <span>Hours: {{ task.actualHours || 0 }}/{{ task.estimatedHours || 0 }}</span>
                  @if (c.isTaskOverdue(task)) {
                    <span class="overdue-label">OVERDUE</span>
                  }
                </div>
                <div class="progress-section">
                  <div class="progress-controls">
                    <label>Progress: {{ task.completionPercentage }}%</label>
                    <input type="range" min="0" max="100" [value]="task.completionPercentage" [disabled]="c.isTaskLockedForReview(task) || task.status === 'done'"
                           (change)="c.updateTaskProgressFromRange(task, $event)">
                    <button class="btn-small" (click)="c.submitTaskForReview(task)" [disabled]="c.isTaskLockedForReview(task) || task.status === 'done'">Submit for Review</button>
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar" [style.width.%]="task.completionPercentage"></div>
                  </div>
                  @if (task.status === 'pending-approval') {
                    <small class="status-note">Waiting for admin approval</small>
                  }
                </div>
                <div class="task-comments">
                  <h4>Comments ({{ (task.comments || []).length }})</h4>
                  @if (task.comments && task.comments.length > 0) {
                    @for (comment of task.comments.slice(-2); track comment.id) {
                      <div class="comment">
                        <strong>{{ comment.userName || 'Unknown' }}:</strong> {{ comment.content || '' }}
                        <small>{{ comment.createdAt | date: 'MMM dd, HH:mm' }}</small>
                      </div>
                    }
                  } @else {
                    <p class="no-comments">No comments yet</p>
                  }
                  <div class="add-comment">
                    <input type="text" placeholder="Add a comment..." #newComment [disabled]="c.isTaskLockedForReview(task)">
                    <button class="btn-small" (click)="c.addCommentToTask(task, newComment)" [disabled]="c.isTaskLockedForReview(task)">Add</button>
                  </div>
                </div>
                <div class="task-actions">
                  <button class="btn-small" (click)="c.viewTaskDetails(task)">View Details</button>
                  <button class="btn-small" (click)="c.chatAboutTask(task)">Chat about Task</button>
                  <button class="btn-small" (click)="c.openTaskActivity(task.id)">Activity</button>
                  <button class="btn-small" (click)="c.setTaskRemindersPrompt(task)" [disabled]="c.isTaskLockedForReview(task)">Reminders</button>
                  <button class="btn-small" (click)="c.logOneHour(task.id)" [disabled]="c.isTaskLockedForReview(task)">+1h</button>
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">
              <p>No tasks found with current filter</p>
            </div>
          }
        </div>

        @if (c.selectedActivityTaskId()) {
          <div class="form-card activity-card">
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
export class AppEmployeeTasksTabComponent {
  @Input() ctx: any;
}
