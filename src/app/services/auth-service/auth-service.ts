import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  fireauth: any;

  SignIn(email: string, password: string) {
    this.fireauth.signInWithEmailAndPassword(email, password)
      .then((userCredential: any) => {
        const user = userCredential.user;
        console.log('User signed in:', user);
      })
      .catch((error: any) => {
        console.error('Error signing in:', error.code, error.message);
      });
  }

  login(email: string, password: string) {
    console.log(`Logging in with email: ${email}`);
    return true;
  }

  async registre(userdata: any) {
    const newuser = await this.fireauth.createUserWithEmailAndPassword(
      userdata.email,
      userdata.password
    );
    console.log('Registering user:', userdata);
    return true;
  }
}
