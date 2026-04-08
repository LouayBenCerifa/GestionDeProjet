import { Injectable, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { Task } from '../../../models/models';
import { TaskService } from '../../../services/api/task-api.service';
import { DashboardDialogService } from '../../../services/dashboard/dashboard-dialog.service';
import { DashboardUtilsService } from '../../../services/dashboard/dashboard-utils.service';

interface ReviewContext {
  currentUserId: string;
  projectName: string;
  employeeName: string;
  onReload: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class AdminVerificationFacade {
  private taskService = inject(TaskService);
  private dashboardDialogService = inject(DashboardDialogService);
  private dashboardUtilsService = inject(DashboardUtilsService);

  async reviewVerificationTask(task: Task, context: ReviewContext): Promise<void> {
    const evidence = task.verification?.evidence || [];
    const evidenceHtml = evidence.length
      ? `<ul style="text-align:left;margin:8px 0 0 16px;">${evidence
          .map((item: string) => `<li><a href="${item}" target="_blank" rel="noopener noreferrer">${item}</a></li>`)
          .join('')}</ul>`
      : '<p style="margin:8px 0 0; color:#64748b;">No evidence provided.</p>';

    const action = await Swal.fire({
      title: 'Review Task Submission',
      html: `
        <div style="text-align:left;">
          <p><strong>Task:</strong> ${task.title}</p>
          <p><strong>Project:</strong> ${context.projectName}</p>
          <p><strong>Employee:</strong> ${context.employeeName}</p>
          <p><strong>Submitted:</strong> ${this.dashboardUtilsService.getVerificationSubmittedAt(task).toLocaleString()}</p>
          <p><strong>Time Spent:</strong> ${task.verification?.timeSpent || 0}h</p>
          <p><strong>Completion Notes:</strong><br>${task.verification?.completionNotes || 'No notes provided.'}</p>
          <p><strong>Evidence:</strong>${evidenceHtml}</p>
        </div>
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Approve',
      denyButtonText: 'Reject',
      cancelButtonText: 'Request Changes',
      width: '720px'
    });

    try {
      if (action.isConfirmed) {
        await this.taskService.approveTaskSubmission(task.id, context.currentUserId);
        await this.dashboardDialogService.showAlert('Task approved successfully.', 'success', 'Verification');
      } else if (action.isDenied) {
        const rejectData = await this.promptReviewFeedback('Reject Task', 'todo');
        if (!rejectData) {
          return;
        }
        await this.taskService.rejectTaskSubmission(
          task.id,
          context.currentUserId,
          rejectData.feedback,
          rejectData.returnStatus,
          false
        );
        await this.dashboardDialogService.showAlert('Task rejected and returned to employee.', 'success', 'Verification');
      } else if (action.dismiss === Swal.DismissReason.cancel) {
        const requestChangesData = await this.promptReviewFeedback('Request Changes', 'in-progress');
        if (!requestChangesData) {
          return;
        }
        await this.taskService.rejectTaskSubmission(
          task.id,
          context.currentUserId,
          requestChangesData.feedback,
          requestChangesData.returnStatus,
          true
        );
        await this.dashboardDialogService.showAlert('Changes requested and feedback sent to employee.', 'success', 'Verification');
      }

      context.onReload();
    } catch (error: any) {
      console.error('❌ Error reviewing task submission:', error);
      await this.dashboardDialogService.showAlert('Verification action failed: ' + error.message, 'error', 'Verification Error');
    }
  }

  private async promptReviewFeedback(
    title: string,
    defaultStatus: 'todo' | 'in-progress'
  ): Promise<{ feedback: string; returnStatus: 'todo' | 'in-progress' } | null> {
    const result = await Swal.fire({
      title,
      html: `
        <label style="display:block;text-align:left;margin-bottom:6px;">Return task status</label>
        <select id="review-return-status" class="swal2-input">
          <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in-progress" ${defaultStatus === 'in-progress' ? 'selected' : ''}>In Progress</option>
        </select>
        <label style="display:block;text-align:left;margin-top:8px;margin-bottom:6px;">Feedback (required)</label>
        <textarea id="review-feedback" class="swal2-textarea" placeholder="Explain what needs to be fixed"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      preConfirm: () => {
        const feedbackElement = document.getElementById('review-feedback') as HTMLTextAreaElement | null;
        const statusElement = document.getElementById('review-return-status') as HTMLSelectElement | null;
        const feedback = (feedbackElement?.value || '').trim();
        const returnStatus = (statusElement?.value || defaultStatus) as 'todo' | 'in-progress';

        if (!feedback) {
          Swal.showValidationMessage('Feedback is required.');
          return null;
        }

        return { feedback, returnStatus };
      }
    });

    if (!result.isConfirmed || !result.value) {
      return null;
    }

    return result.value as { feedback: string; returnStatus: 'todo' | 'in-progress' };
  }
}

