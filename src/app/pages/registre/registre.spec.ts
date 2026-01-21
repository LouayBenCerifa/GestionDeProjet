import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Registre } from './registre';

describe('Registre', () => {
  let component: Registre;
  let fixture: ComponentFixture<Registre>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registre]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Registre);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
