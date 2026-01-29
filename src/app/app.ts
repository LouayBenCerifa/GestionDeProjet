import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth-service/auth-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="app-container">
      <!-- Show header only on dashboard -->
      @if (showHeader) {
        <header class="app-header">
          <div class="header-logo">
            <h1>TaskManager</h1>
          </div>
          <nav class="header-nav">
            <span class="user-email">{{ userEmail }}</span>
          </nav>
        </header>
      }
      
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
      
      <!-- Show footer only on auth pages -->
      @if (!showHeader) {
        <footer class="app-footer">
          <p>© 2024 TaskManager. All rights reserved.</p>
        </footer>
      }
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .app-header {
      background: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 0 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 70px;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    
    .header-logo h1 {
      color: #667eea;
      margin: 0;
      font-size: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .user-email {
      color: #7f8c8d;
      font-size: 14px;
    }
    
    .main-content {
      flex: 1;
    }
    
    .app-footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  
  showHeader = false;
  userEmail = '';

  ngOnInit() {
    // Watch route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const currentRoute = this.router.url;
        this.showHeader = currentRoute.includes('/dashboard');
        
        // Update user email if logged in
        if (this.authService.isAuthenticated()) {
          this.userEmail = this.authService.getUserEmail() || '';
        }
      });
  }
}