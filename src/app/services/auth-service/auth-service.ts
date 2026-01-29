import { Injectable, inject } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  User,
  sendPasswordResetEmail,
  user
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private router = inject(Router);

  // Observable to track auth state
  user$: Observable<User | null>;

  constructor() {
    this.user$ = user(this.auth);
  }

  // Login user
  async login(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ User signed in:', result.user.email);
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      
      // User-friendly error messages
      let errorMessage = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Register new user
  async register(email: string, password: string): Promise<void> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('✅ User registered:', result.user.email);
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('❌ Registration failed:', error.message);
      
      // User-friendly error messages
      let errorMessage = 'Registration failed. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset failed:', error.message);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('✅ User signed out');
      await this.router.navigate(['/signin']);
    } catch (error: any) {
      console.error('❌ Logout failed:', error.message);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  // Get user email
  getUserEmail(): string | null {
    return this.auth.currentUser?.email || null;
  }

  // Get user ID
  getUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  // Get auth state as observable
  getAuthState() {
    return this.user$;
  }
}