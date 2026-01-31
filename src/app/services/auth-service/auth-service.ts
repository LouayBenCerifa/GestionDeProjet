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
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, from, switchMap, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router = inject(Router);

  // Observable to track auth state
  user$: Observable<User | null>;

  constructor() {
    this.user$ = user(this.auth);
  }

  // Get user role from Firestore
  async getUserRole(uid: string): Promise<string> {
    try {
      const userDocRef = doc(this.firestore, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData['role'] || 'employee'; // Default to employee if role not found
      } else {
        // If user document doesn't exist, create one with default role
        await setDoc(userDocRef, { role: 'employee', email: this.auth.currentUser?.email });
        return 'employee';
      }
    } catch (error) {
      console.error('❌ Error fetching user role:', error);
      return 'employee'; // Default to employee on error
    }
  }

  // Login user with role-based navigation
  async login(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ User signed in:', result.user.email);
      
      // Get user role and navigate accordingly
      const userRole = await this.getUserRole(result.user.uid);
      await this.navigateBasedOnRole(userRole);
      
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

  // Register new user with default role
  async register(email: string, password: string, role: string = 'employee'): Promise<void> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('✅ User registered:', result.user.email);
      
      // Create user document in Firestore with role
      const userDocRef = doc(this.firestore, 'users', result.user.uid);
      await setDoc(userDocRef, {
        email: email,
        role: role,
        createdAt: new Date()
      });
      
      // Navigate based on role
      await this.navigateBasedOnRole(role);
      
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

  // Navigate based on user role
  private async navigateBasedOnRole(role: string): Promise<void> {
    switch (role) {
      case 'admin':
        await this.router.navigate(['/dashboard/admin']);
        break;
      case 'employee':
      default:
        await this.router.navigate(['/dashboard/employee']);
        break;
    }
  }

  // Get current user with role (Observable)
  getCurrentUserWithRole(): Observable<{ user: User | null, role: string | null }> {
    return this.user$.pipe(
      switchMap((user) => {
        if (user) {
          return from(this.getUserRole(user.uid)).pipe(
            switchMap((role) => of({ user, role }))
          );
        } else {
          return of({ user: null, role: null });
        }
      })
    );
  }

  // Check if user has specific role
  async hasRole(expectedRole: string): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;
    
    const userRole = await this.getUserRole(user.uid);
    return userRole === expectedRole;
  }

  // Get current user role
  async getCurrentUserRole(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    return await this.getUserRole(user.uid);
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