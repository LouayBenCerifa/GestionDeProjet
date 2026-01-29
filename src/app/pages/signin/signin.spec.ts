import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Signin } from './signin';

describe('Signin', () => {
  let component: Signin;
  let fixture: ComponentFixture<Signin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Signin, ReactiveFormsModule]  // ✅ Added ReactiveFormsModule
    }).compileComponents();

    fixture = TestBed.createComponent(Signin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with validators', () => {
    expect(component['LoginForm']).toBeDefined();
    expect(component['LoginForm'].get('email')?.hasError('required')).toBeTrue();
    expect(component['LoginForm'].get('password')?.hasError('minlength')).toBeTrue();
  });
});
