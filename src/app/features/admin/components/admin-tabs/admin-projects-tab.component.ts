import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-projects-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="section-header">
          <h2>Manage Projects</h2>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" (click)="c.toggleCreateProjectForm()">+ New Project</button>
            <button class="btn btn-secondary" (click)="c.createTestProject()" style="background: #f59e0b;">Test Project</button>
          </div>
        </div>

        @if (c.showCreateProjectForm()) {
          <div class="form-card">
            <h3>Create New Project</h3>
            <form [formGroup]="c.projectForm" (ngSubmit)="c.createProject()" class="form">
              <input type="text" placeholder="Project Name" formControlName="name" class="input">
              @if (c.projectForm.get('name')?.invalid && c.projectForm.get('name')?.touched) {
                <small class="error">Project name is required (min 3 characters)</small>
              }
              <textarea placeholder="Description" formControlName="description" class="textarea"></textarea>
              @if (c.projectForm.get('description')?.invalid && c.projectForm.get('description')?.touched) {
                <small class="error">Description is required</small>
              }
              <div class="date-row">
                <div>
                  <label>Start Date</label>
                  <input type="date" formControlName="startDate" class="input">
                  @if (c.projectForm.get('startDate')?.invalid && c.projectForm.get('startDate')?.touched) {
                    <small class="error">Start date is required</small>
                  }
                </div>
                <div>
                  <label>End Date</label>
                  <input type="date" formControlName="endDate" class="input">
                  @if (c.projectForm.get('endDate')?.invalid && c.projectForm.get('endDate')?.touched) {
                    <small class="error">End date is required</small>
                  }
                </div>
              </div>
              <select formControlName="status" class="input">
                <option value="">Select Status</option>
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
              @if (c.projectForm.get('status')?.invalid && c.projectForm.get('status')?.touched) {
                <small class="error">Status is required</small>
              }

              <div>
                <label>Team Members (can receive project tasks)</label>
                <div class="team-members-selector" style="display:grid; gap:8px; margin-top:8px;">
                  @if (c.employees().length > 0) {
                    @for (emp of c.employees(); track emp.id) {
                      <label style="display:flex; align-items:center; gap:8px;">
                        <input
                          type="checkbox"
                          [checked]="c.isProjectTeamMemberSelected(emp.id)"
                          (change)="c.toggleProjectTeamMember(emp.id, $event)"
                        >
                        <span>{{ emp.name || emp.email }} ({{ emp.email }})</span>
                      </label>
                    }
                  } @else {
                    <small>No employees available</small>
                  }
                </div>
                <small>Only selected employees can be assigned tasks in this project.</small>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" [disabled]="!c.projectForm.valid">Create Project</button>
                <button type="button" class="btn btn-secondary" (click)="c.toggleCreateProjectForm()">Cancel</button>
              </div>
            </form>
          </div>
        }

        <div class="projects-grid">
          @if (c.projects().length > 0) {
            @for (project of c.projects(); track project.id) {
              <div class="project-card">
                <div class="project-header">
                  <h3>{{ project.name || 'Unnamed Project' }}</h3>
                  <div class="project-actions">
                    <button class="btn-icon" (click)="c.editProject(project)" title="Edit Team"><span class="material-symbols-rounded app-icon">groups</span></button>
                    <button class="btn-icon" (click)="c.deleteProject(project)" title="Delete Project and Tasks"><span class="material-symbols-rounded app-icon">delete</span></button>
                  </div>
                </div>
                <p class="project-description">{{ project.description || 'No description' }}</p>
                <div class="project-meta">
                  <span class="badge"
                        [class.status-planning]="project.status === 'planning'"
                        [class.status-in-progress]="project.status === 'in-progress'"
                        [class.status-on-hold]="project.status === 'on-hold'"
                        [class.status-completed]="project.status === 'completed'">
                    {{ project.status || 'planning' | titlecase }}
                  </span>
                  <span class="meta-chip"><span class="material-symbols-rounded">groups</span>Team: {{ (project.teamMembers || []).length }} members</span>
                  <span class="meta-chip"><span class="material-symbols-rounded">task_alt</span>Tasks: {{ project.taskCount || 0 }}</span>
                  <label class="project-status-control" title="Update project status">
                    <span class="material-symbols-rounded">sync_alt</span>
                    <select class="input" [value]="project.status" (change)="c.changeProjectStatus(project, $event)">
                      <option value="planning">Planning</option>
                      <option value="in-progress">In Progress</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                </div>
                <div class="progress-bar-container">
                  <div class="progress-bar" [style.width.%]="project.completionPercentage || 0"></div>
                </div>
                <p class="progress-text">{{ project.completedTaskCount || 0 }} / {{ project.taskCount || 0 }} tasks done • {{ (project.completionPercentage || 0).toFixed(0) }}% complete</p>
                <div class="project-dates">
                  <small>Start: {{ project.startDate | date: 'MMM dd, yyyy' }}</small>
                  <small>End: {{ project.endDate | date: 'MMM dd, yyyy' }}</small>
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">
              <p>No projects yet. Create your first project!</p>
            </div>
          }
        </div>
      </section>
    }
  `
})
export class AppAdminProjectsTabComponent {
  @Input() ctx: any;
}
