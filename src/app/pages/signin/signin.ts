import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth-service/auth-service';
@Component({
  selector: 'app-signin',
  imports: [ReactiveFormsModule],
  templateUrl: './signin.html',
  styleUrl: './signin.css',
})
export class Signin {
  private AuthService = inject(AuthService);
  
  ngOnInit() {
    this.LoginForm = this.fb.group({
      email: ['',[Validators.required, Validators.email]],
      password: ['',[Validators.required, Validators.minLength(6)]],
    });
  }

  constructor(private fb: FormBuilder) {}
  LoginForm!: FormGroup;
  Login(){
    console.log('Login function called');
    console.log(this.LoginForm.value);
    
  }
}
