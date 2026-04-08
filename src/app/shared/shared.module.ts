import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StatusColorPipe } from './pipes/status-color.pipe';
import { TimeRemainingPipe } from './pipes/time-remaining.pipe';

@NgModule({
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		StatusColorPipe,
		TimeRemainingPipe,
	],
	exports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		StatusColorPipe,
		TimeRemainingPipe,
	],
})
export class SharedModule {}
