import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const strongPasswordValidator = (): ValidatorFn => {
	return (control: AbstractControl): ValidationErrors | null => {
		const value = String(control.value || '');
		if (!value) {
			return null;
		}

		const hasUpper = /[A-Z]/.test(value);
		const hasLower = /[a-z]/.test(value);
		const hasNumber = /\d/.test(value);
		const hasMinLength = value.length >= 8;

		return hasUpper && hasLower && hasNumber && hasMinLength
			? null
			: { strongPassword: true };
	};
};

export const matchFieldsValidator = (fieldA: string, fieldB: string): ValidatorFn => {
	return (control: AbstractControl): ValidationErrors | null => {
		const first = control.get(fieldA)?.value;
		const second = control.get(fieldB)?.value;
		return first === second ? null : { fieldsMismatch: true };
	};
};
