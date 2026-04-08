import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <div class="stats-grid dashboard-metrics-grid">
          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">folder</span>
              <h3>Total Projects</h3>
            </div>
            <p class="stat-value">{{ c.dashboardStats()?.totalProjects || 0 }}</p>
            <p class="stat-label">All created projects</p>
          </div>

          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">rocket_launch</span>
              <h3>Active Projects</h3>
            </div>
            <p class="stat-value">{{ c.dashboardStats()?.activeProjects || 0 }}</p>
            <p class="stat-label">Currently in progress</p>
          </div>

          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">task_alt</span>
              <h3>Total Tasks</h3>
            </div>
            <p class="stat-value">{{ c.dashboardStats()?.totalTasks || 0 }}</p>
            <p class="stat-label">Across all projects</p>
          </div>

          <div class="stat-card dashboard-metric-card">
            <div class="stat-header">
              <span class="stat-icon material-symbols-rounded app-icon">check_circle</span>
              <h3>Completed Tasks</h3>
            </div>
            <p class="stat-value">{{ c.dashboardStats()?.completedTasks || 0 }}</p>
            <p class="stat-label">Verified as done</p>
          </div>
        </div>

        <div class="dashboard-section-card">
          <div class="section-header">
            <h2>Project Progress</h2>
          </div>

          @if (c.dashboardStats()?.projectProgress?.length > 0) {
            <div class="project-progress-list">
              @for (item of c.dashboardStats().projectProgress; track item.projectId) {
                <div class="progress-item">
                  <div class="progress-headline">
                    <div class="progress-title-wrap">
                      <span class="progress-project-icon material-symbols-rounded app-icon">folder_open</span>
                      <div>
                        <h3>{{ item.projectName }}</h3>
                        <p class="progress-subtitle">{{ item.tasksDone }} / {{ item.tasksTotal }} tasks completed</p>
                      </div>
                    </div>
                    <span class="progress-value">{{ item.progress.toFixed(0) }}%</span>
                  </div>

                  <div class="progress-track">
                    <div class="progress-fill" [style.width.%]="item.progress"></div>
                  </div>

                  <div class="progress-meta">
                    <span class="progress-chip">
                      <span class="material-symbols-rounded">checklist</span>
                      {{ item.tasksDone }} done
                    </span>
                    <span class="progress-chip">
                      <span class="material-symbols-rounded">assignment</span>
                      {{ item.tasksTotal }} total
                    </span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">No project progress data available.</div>
          }
        </div>
      </section>
    }
  `,
})
export class AppAdminDashboardTabComponent {
  @Input() ctx: any;
}
