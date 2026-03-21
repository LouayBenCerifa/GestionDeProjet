import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth-service';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './signin.html',
  styleUrl: './signin.css',
})
export class Signin implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  LoginForm!: FormGroup;
  isLoading = false;
  isResettingPassword = false;
  errorMessage = '';
  successMessage = '';
  isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  private handleOnline = () => {
    this.isOffline = false;
    if (this.errorMessage.includes('internet') || this.errorMessage.includes('Network')) {
      this.errorMessage = '';
    }
  };

  private handleOffline = () => {
    this.isOffline = true;
    this.errorMessage = 'You are offline. Please connect to the internet to sign in.';
  };

  ngOnInit() {
    // Check if user is already logged in
    const user = this.authService.getCurrentUser();
    if (user) {
      this.router.navigate(['/dashboard/employee']);
    }
    
    this.LoginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  async Login() {
    if (this.isOffline) {
      this.errorMessage = 'You are offline. Please connect to the internet and try again.';
      return;
    }

    if (this.LoginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const { email, password } = this.LoginForm.value;
      
      try {
        await this.authService.login(email, password);
      } catch (err: any) {
        this.errorMessage = err.message || 'Login failed. Please check your credentials.';
        console.error('Login error:', err);
      } finally {
        this.isLoading = false;
      }
    }
  }
  async resetPassword() {
    if (this.isOffline) {
      this.errorMessage = 'You are offline. Please connect to the internet and try again.';
      this.successMessage = '';
      return;
    }

    const emailControl = this.LoginForm.get('email');
    const email = String(emailControl?.value || '').trim();

    if (!email) {
      this.errorMessage = 'Enter your email address first to receive a reset link.';
      this.successMessage = '';
      emailControl?.markAsTouched();
      return;
    }

    if (!emailControl?.valid) {
      this.errorMessage = 'Please enter a valid email address.';
      this.successMessage = '';
      emailControl?.markAsTouched();
      return;
    }

    this.isResettingPassword = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.authService.resetPassword(email);
      this.successMessage = 'Password reset email sent. Check your inbox and spam folder.';
    } catch (err: any) {
      this.errorMessage = err.message || 'Failed to send reset email.';
    } finally {
      this.isResettingPassword = false;
    }
  }
}