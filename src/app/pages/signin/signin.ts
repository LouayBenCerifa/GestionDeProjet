import { Component, inject, OnInit } from '@angular/core';
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
export class Signin implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  LoginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  ngOnInit() {
    // Check if user is already logged in
    const user = this.authService.getCurrentUser();
    if (user) {
      this.router.navigate(['/dashboard-employee']);
    }
    
    this.LoginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async Login() {
    if (this.LoginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
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
  const email = this.LoginForm.get('email')?.value;
  
  if (!email) {
    this.errorMessage = 'Please enter your email address first.';
    return;
  }
  
  if (!this.LoginForm.get('email')?.valid) {
    this.errorMessage = 'Please enter a valid email address.';
    return;
  }
  
  try {
    await this.authService.resetPassword(email);
    this.errorMessage = '';
    alert('Password reset email sent! Check your inbox.');
  } catch (err: any) {
    this.errorMessage = err.message || 'Failed to send reset email.';
  }
}
}