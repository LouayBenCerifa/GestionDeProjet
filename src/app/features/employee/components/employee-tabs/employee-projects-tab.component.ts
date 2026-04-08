import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-projects-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="section-header">
          <h2>My Projects</h2>
          <div class="filter-controls">
            <select class="input" [(ngModel)]="c.projectFilter" (change)="c.filterProjects()">
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
        </div>

        <div class="projects-grid">
          @if (c.filteredProjects().length > 0) {
            @for (project of c.filteredProjects(); track project.id) {
              <div class="project-card">
                <div class="project-header">
                  <h3>{{ project.name || 'Unnamed Project' }}</h3>
                  <span class="badge"
                        [class.status-planning]="project.status === 'planning'"
                        [class.status-in-progress]="project.status === 'in-progress'"
                        [class.status-on-hold]="project.status === 'on-hold'"
                        [class.status-completed]="project.status === 'completed'">
                    {{ project.status || 'planning' | titlecase }}
                  </span>
                </div>
                <p class="project-description">{{ project.description || 'No description' }}</p>
                <div class="project-stats">
                  <div class="stat">
                    <span class="stat-label">Tasks</span>
                    <span class="stat-value">{{ c.getProjectTaskCount(project.id) }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">My Tasks</span>
                    <span class="stat-value">{{ c.getMyTasksInProject(project.id).length }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Completion</span>
                    <span class="stat-value">{{ (project.completionPercentage || 0).toFixed(0) }}%</span>
                  </div>
                </div>
                <div class="progress-section">
                  <div class="progress-bar-container">
                    <div class="progress-bar" [style.width.%]="project.completionPercentage || 0"></div>
                  </div>
                </div>
                <div class="project-team">
                  <h4>Team Members</h4>
                  <div class="team-avatars">
                    @for (member of (project.teamMembers || []); track member) {
                      <img [src]="'https://ui-avatars.com/api/?name=' + c.getMemberName(member)"
                           [alt]="c.getMemberName(member)" class="team-avatar">
                    }
                  </div>
                </div>
                <div class="project-dates">
                  <small>Start: {{ project.startDate | date: 'MMM dd, yyyy' }}</small>
                  <small>End: {{ project.endDate | date: 'MMM dd, yyyy' }}</small>
                </div>
                <div class="project-actions">
                  <button class="btn-small" (click)="c.viewProjectDetails(project)">View Details</button>
                  <button class="btn-small" (click)="c.viewProjectTasks(project)">View Tasks</button>
                  <button class="btn-small" (click)="c.chatWithAdmin(project.adminId)">Chat</button>
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">
              <p>No projects found with current filter</p>
            </div>
          }
        </div>
      </section>
    }
  `
})
export class AppEmployeeProjectsTabComponent {
  @Input() ctx: any;
}
