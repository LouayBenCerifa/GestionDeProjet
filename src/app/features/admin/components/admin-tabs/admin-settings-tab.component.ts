import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    @if (ctx; as c) {
      <section class="content">
        <h2>Settings</h2>
        <div class="settings-card admin-profile-card">
          <div class="admin-profile-headline">
            <div class="admin-profile-identity">
              <img class="admin-profile-avatar" [src]="'https://ui-avatars.com/api/?name=' + c.userName()" alt="Admin Profile">
              <div>
                <h3>Admin Profile</h3>
                <p class="admin-profile-subtitle">Your account information and role details</p>
              </div>
            </div>
            <span class="meta-chip">
              <span class="material-symbols-rounded">verified_user</span>
              Administrator
            </span>
          </div>

          <div class="admin-profile-grid">
            <div class="admin-profile-row">
              <span class="material-symbols-rounded">badge</span>
              <p><strong>Name:</strong> {{ c.userName() }}</p>
            </div>
            <div class="admin-profile-row">
              <span class="material-symbols-rounded">mail</span>
              <p><strong>Email:</strong> {{ c.userEmail() }}</p>
            </div>
            <div class="admin-profile-row">
              <span class="material-symbols-rounded">admin_panel_settings</span>
              <p><strong>Role:</strong> Administrator</p>
            </div>
            <div class="admin-profile-row">
              <span class="material-symbols-rounded">fingerprint</span>
              <p><strong>User ID:</strong> {{ c.currentUserId() }}</p>
            </div>
          </div>
        </div>
      </section>
    }
  `
})
export class AppAdminSettingsTabComponent {
  @Input() ctx: any;
}
