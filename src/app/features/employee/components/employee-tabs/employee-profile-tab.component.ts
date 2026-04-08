import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-profile-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="profile-container">
          <div class="profile-header">
            <img [src]="'https://ui-avatars.com/api/?name=' + c.userName() + '&size=120'"
                 alt="Profile" class="profile-avatar">
            <div class="profile-info">
              <h2>{{ c.userName() }}</h2>
              <p class="profile-role">Employee</p>
              <p class="profile-email">{{ c.userEmail() }}</p>
              <p class="profile-id">ID: {{ c.currentUserId() }}</p>
            </div>
            <button class="btn btn-primary" (click)="c.editProfile()">Edit Profile</button>
          </div>

          <div class="profile-stats">
            <div class="stat-card">
              <span class="stat-icon material-symbols-rounded app-icon">psychology</span>
              <span class="stat-value">{{ c.getDashboardStats().totalTasks }}</span>
              <span class="stat-label">Total Tasks</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon material-symbols-rounded app-icon">task_alt</span>
              <span class="stat-value">{{ c.getDashboardStats().completedTasks }}</span>
              <span class="stat-label">Completed</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon material-symbols-rounded app-icon">folder</span>
              <span class="stat-value">{{ c.getDashboardStats().activeProjects }}</span>
              <span class="stat-label">Projects</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon material-symbols-rounded app-icon">star</span>
              <span class="stat-value">{{ c.getDashboardStats().performanceRating }}</span>
              <span class="stat-label">Performance</span>
            </div>
          </div>

          <div class="profile-details">
            <div class="detail-section">
              <h3>Personal Information</h3>
              <div class="detail-row">
                <span class="detail-label">Full Name:</span>
                <span class="detail-value">{{ c.userName() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ c.userEmail() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Employee ID:</span>
                <span class="detail-value">{{ c.currentUserId().substring(0, 8) }}...</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Role:</span>
                <span class="detail-value badge status-in-progress">Employee</span>
              </div>
            </div>

            <div class="detail-section">
              <h3>Work Information</h3>
              <div class="detail-row">
                <span class="detail-label">Department:</span>
                <span class="detail-value">{{ c.employeeInfo()?.department || 'Not specified' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Position:</span>
                <span class="detail-value">{{ c.employeeInfo()?.position || 'Employee' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Join Date:</span>
                <span class="detail-value">{{ c.employeeInfo()?.joinDate | date: 'MMM dd, yyyy' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value badge status-active">Active</span>
              </div>
            </div>
          </div>

          <div class="profile-actions">
            <button class="btn btn-secondary" (click)="c.changePassword()">Change Password</button>
            <button class="btn btn-secondary" (click)="c.updateSkills()">Update Skills</button>
            <button class="btn btn-secondary" (click)="c.viewReports()">View Reports</button>
            <button class="btn btn-danger" (click)="c.requestAccountDeletion()">Request Account Deletion</button>
          </div>
        </div>
      </section>
    }
  `
})
export class AppEmployeeProfileTabComponent {
  @Input() ctx: any;
}
