import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface AppNavItem {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside [class.collapsed]="isCollapsed()" class="sidebar">
      <!-- Header with Logo and Collapse Button -->
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">
            <span class="material-symbols-rounded">bolt</span>
          </div>
          @if (!isCollapsed()) {
            <span class="brand-name">GestionPro</span>
          }
        </div>
        <button class="collapse-btn" (click)="toggleCollapse()" [title]="isCollapsed() ? 'Expand' : 'Collapse'">
          <span class="material-symbols-rounded">{{ isCollapsed() ? 'chevron_right' : 'chevron_left' }}</span>
        </button>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav">
        @for (item of items; track item.key) {
          <a
            class="nav-item"
            [class.active]="activeTab === item.key"
            (click)="onTabClick(item.key, $event)"
            [title]="item.label">
            <span class="nav-icon material-symbols-rounded">{{ item.icon }}</span>
            @if (!isCollapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Footer with Logout -->
      <div class="sidebar-footer">
        <button class="logout-btn" (click)="logout.emit()" [title]="'Logout'">
          <span class="material-symbols-rounded">logout</span>
          @if (!isCollapsed()) {
            <span>Logout</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: `
    :host {
      --md-primary: #6366f1;
      --md-primary-dark: #4f46e5;
      --md-surface: #1e1e2e;
      --md-surface-light: #2a2a3e;
      --md-surface-lighter: #36363f;
      --md-on-surface: #e0e0e0;
      --md-on-surface-variant: #a0a0a8;
    }

    .sidebar {
      width: 280px;
      height: 100vh;
      background: linear-gradient(180deg, var(--md-surface) 0%, var(--md-surface-light) 100%);
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--md-surface-lighter);
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    }

    .sidebar.collapsed {
      width: 80px;

      .logo-container {
        justify-content: center;
      }

      .nav-label,
      .logout-btn span:not(.material-symbols-rounded) {
        display: none;
      }
    }

    /* Header Section */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 12px;
      border-bottom: 1px solid var(--md-surface-lighter);
      flex-shrink: 0;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      transition: justify-content 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .logo-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--md-primary) 0%, var(--md-primary-dark) 100%);
      color: white;
      font-weight: 600;
      flex-shrink: 0;
      transition: transform 0.2s ease;

      .material-symbols-rounded {
        font-size: 24px;
        font-weight: 700;
      }
    }

    .logo-icon:hover {
      transform: scale(1.05);
    }

    .brand-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--md-on-surface);
      letter-spacing: -0.5px;
    }

    /* Collapse Button */
    .collapse-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--md-on-surface-variant);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;

      .material-symbols-rounded {
        font-size: 20px;
      }
    }

    .collapse-btn:hover {
      background: var(--md-surface-lighter);
      color: var(--md-on-surface);
    }

    /* Navigation Menu */
    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 8px;
      overflow-y: auto;
      overflow-x: hidden;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--md-surface-lighter);
        border-radius: 3px;

        &:hover {
          background: var(--md-on-surface-variant);
        }
      }
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      color: var(--md-on-surface-variant);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      position: relative;

      .nav-icon {
        flex-shrink: 0;
        font-size: 20px;
        display: flex;
      }

      .nav-label {
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.3px;
        white-space: nowrap;
      }

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: var(--md-primary);
        border-radius: 0 4px 4px 0;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
    }

    .nav-item:hover {
      background: rgba(99, 102, 241, 0.08);
      color: var(--md-on-surface);
    }

    .nav-item.active {
      background: rgba(99, 102, 241, 0.15);
      color: var(--md-primary);
      font-weight: 600;

      &::before {
        opacity: 1;
      }
    }

    /* Footer Section */
    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid var(--md-surface-lighter);
      flex-shrink: 0;
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #ef4444;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;

      .material-symbols-rounded {
        font-size: 18px;
      }

      span {
        white-space: nowrap;
      }
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .logout-btn:active {
      transform: scale(0.98);
    }

    /* Smooth scroll behavior */
    @media (prefers-reduced-motion: reduce) {
      .sidebar,
      .logo-container,
      .nav-item,
      .collapse-btn,
      .logo-icon,
      .logout-btn {
        transition: none;
      }
    }
  `
})
export class AppSidebarComponent {
  @Input() items: AppNavItem[] = [];
  @Input() activeTab = '';

  @Output() tabChange = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();

  isCollapsed = signal(false);

  toggleCollapse(): void {
    this.isCollapsed.update(collapsed => !collapsed);
  }

  onTabClick(tab: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.tabChange.emit(tab);
  }
}
