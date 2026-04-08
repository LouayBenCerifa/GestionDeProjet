import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FeatureAuthService } from '../../services/auth.service';
import { matchFieldsValidator, strongPasswordValidator } from '../../../../utils/validators';
import { ROUTES_CONST } from '../../../../constants/routes.const';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(FeatureAuthService);

  readonly loginPath = ROUTES_CONST.signin;

  isLoading = false;
  errorMessage = '';

  readonly registerForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
      role: ['employee' as 'admin' | 'employee', [Validators.required]],
    },
    { validators: matchFieldsValidator('password', 'confirmPassword') }
  );

  async ngOnInit(): Promise<void> {
    const role = await this.authService.getCurrentUserRole();

    if (role === 'admin') {
      await this.router.navigate([ROUTES_CONST.dashboardAdmin]);
      return;
    }

    if (role === 'employee') {
      await this.router.navigate([ROUTES_CONST.dashboardEmployee]);
    }
  }

  async register(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { email, password, role } = this.registerForm.getRawValue();
    if (!email || !password || !role) {
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    try {
      await this.authService.register(email, password, role);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unable to create account.';
    } finally {
      this.isLoading = false;
    }
  }
}
