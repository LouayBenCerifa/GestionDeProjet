import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-main-layout',
	standalone: true,
	imports: [CommonModule, RouterOutlet],
	templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {}
