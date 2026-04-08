import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { DashboardDialogService } from '../../../services/dashboard/dashboard-dialog.service';
import { EmployeeDashboardDataService } from '../../../services/dashboard/employee-dashboard-data.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeProfileFacade {
  private auth = inject(Auth);
  private dashboardDialogService = inject(DashboardDialogService);
  private employeeDashboardDataService = inject(EmployeeDashboardDataService);

  async editProfile(): Promise<void> {
    await this.dashboardDialogService.showAlert('Edit profile functionality coming soon!', 'info', 'Not Yet Available');
  }

  async changePassword(userEmail: string): Promise<void> {
    const user = this.auth.currentUser;

    if (userEmail && user) {
      try {
        await sendPasswordResetEmail(this.auth, userEmail);
        await this.dashboardDialogService.showAlert('Password reset email sent! Check your inbox.', 'success', 'Password Reset');
      } catch (error: any) {
        await this.dashboardDialogService.showAlert('Error sending password reset email: ' + error.message, 'error', 'Password Reset Failed');
      }
    } else {
      await this.dashboardDialogService.showAlert('Cannot change password: No user email found or not authenticated', 'error', 'Password Reset Failed');
    }
  }

  async updateSkills(userId: string): Promise<void> {
    const skills = await this.dashboardDialogService.showTextInput('Skills', 'Enter your skills (comma separated)');
    if (!skills) {
      return;
    }

    const normalizedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await this.employeeDashboardDataService.updateEmployeeSkills(userId, normalizedSkills);
      await this.dashboardDialogService.showAlert('Skills updated successfully!', 'success', 'Skills Updated');
    } catch (error: any) {
      await this.dashboardDialogService.showAlert('Error updating skills: ' + error.message, 'error', 'Skills Update Failed');
    }
  }

  async viewReports(): Promise<void> {
    await this.dashboardDialogService.showAlert('View reports functionality coming soon!', 'info', 'Not Yet Available');
  }

  async requestAccountDeletion(): Promise<void> {
    const confirmed = await this.dashboardDialogService.showConfirm(
      'Are you sure you want to request account deletion? This will notify administrators.',
      'Request Account Deletion'
    );

    if (confirmed) {
      await this.dashboardDialogService.showAlert('Account deletion request sent to administrators.', 'success', 'Request Sent');
    }
  }
}
