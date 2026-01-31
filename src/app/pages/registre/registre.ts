import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth-service';

@Component({
  selector: 'app-registre',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './registre.html',
  styleUrl: './registre.css',
})
export class Registre implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  RegisterForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    // Check if user is already logged in
    const user = this.authService.getCurrentUser();
    if (user) {
      this.router.navigate(['/dashboard-admin']);
    }
    
    this.RegisterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  async register() {
    if (this.RegisterForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const { email, password } = this.RegisterForm.value;
      
      try {
        await this.authService.register(email, password);
        this.successMessage = 'Account created successfully! Redirecting...';
      } catch (err: any) {
        this.errorMessage = err.message || 'Registration failed. Please try again.';
        console.error('Registration error:', err);
      } finally {
        this.isLoading = false;
      }
    }
  }
}