import { Injectable, inject } from '@angular/core';
import { Task } from '../../models/models';
import { TaskService } from '../api/task-api.service';
import Swal from 'sweetalert2';

/**
 * TaskActionsFacadeService - Encapsulates all task action logic for employee dashboard
 * Handles task progress updates, comments, reminders, time logging, and submission for review
 */
@Injectable({
  providedIn: 'root'
})
export class TaskActionsFacadeService {
  private taskService = inject(TaskService);

  constructor() {}

  /**
   * Update task progress by increment (typically 10%)
   */
  async updateTaskProgress(
    task: Task,
    employeeId: string,
    onUpdateCallback: () => void
  ): Promise<void> {
    if (this.isTaskLockedForReview(task) || task.status === 'done') {
      return;
    }

    const newProgress = Math.min(100, task.completionPercentage + 10);

    try {
      // Update in Firestore
      await this.taskService.updateTask(task.id, {
        completionPercentage: newProgress,
        status: newProgress > 0 && task.status === 'todo' ? 'in-progress' : task.status
      });

      console.log('✅ Task progress updated');
      onUpdateCallback();
    } catch (error: any) {
      console.error('❌ Error updating task progress:', error);
      throw new Error('Error updating task: ' + error.message);
    }
  }

  /**
   * Update task progress from range input (slider)
   */
  async updateTaskProgressFromRange(
    task: Task,
    newProgress: number,
    onUpdateCallback: () => void
  ): Promise<void> {
    if (this.isTaskLockedForReview(task) || task.status === 'done') {
      return;
    }

    const progressValue = Math.min(100, Math.max(0, newProgress));

    try {
      await this.taskService.updateTask(task.id, {
        completionPercentage: progressValue,
        status: progressValue > 0 && task.status === 'todo' ? 'in-progress' : task.status
      });

      console.log('✅ Task progress updated from range');
      onUpdateCallback();
    } catch (error: any) {
      console.error('❌ Error updating task progress:', error);
      throw new Error('Error updating task: ' + error.message);
    }
  }

  /**
   * Add a comment to a task with prompt dialog
   */
  async addCommentWithPrompt(
    task: Task,
    employeeId: string,
    employeeName: string,
    onUpdateCallback: () => void
  ): Promise<void> {
    if (this.isTaskLockedForReview(task)) {
      await this.showAlert(
        'This task is pending admin review. Comments are locked until reviewed.',
        'info',
        'Task Locked'
      );
      return;
    }

    const comment = await this.showTextInput('Add Comment', 'Enter your comment');
    if (comment) {
      await this.addComment(task, employeeId, employeeName, comment, onUpdateCallback);
    }
  }

  /**
   * Add a comment to a task
   */
  async addComment(
    task: Task,
    employeeId: string,
    employeeName: string,
    commentText: string,
    onUpdateCallback: () => void
  ): Promise<void> {
    if (this.isTaskLockedForReview(task)) {
      return;
    }

    const trimmedComment = commentText.trim();
    if (!trimmedComment) {
      return;
    }

    try {
      await this.taskService.addCommentToTask(
        task.id,
        employeeId,
        employeeName,
        'employee',
        trimmedComment
      );

      console.log('✅ Comment added');
      onUpdateCallback();
    } catch (error: any) {
      console.error('❌ Error adding comment:', error);
      throw new Error('Error adding comment: ' + error.message);
    }
  }

  /**
   * Set task reminders with prompt dialog
   */
  async setTaskRemindersPrompt(
    task: Task,
    actorId: string,
    actorName: string,
    actorRole: 'admin' | 'employee',
    onUpdateCallback: () => void
  ): Promise<void> {
    if (this.isTaskLockedForReview(task)) {
      await this.showAlert(
        'This task is pending admin review. Reminders are locked until reviewed.',
        'info',
        'Task Locked'
      );
      return;
    }

    const currentValue = (task.reminderOffsetsMinutes || []).join(', ');
    const input = await this.showTextInput(
      'Reminders',
      'Enter reminder offsets in minutes (comma separated)',
      currentValue
    );

    if (input === null) {
      return;
    }

    const reminderOffsets = this.parseNumberList(input);

    try {
      await this.taskService.setTaskReminders(
        task.id,
        reminderOffsets,
        actorId,
        actorName,
        actorRole
      );

      console.log('✅ Task reminders updated');
      onUpdateCallback();
    } catch (error: any) {
      console.error('❌ Error updating reminders:', error);
      throw new Error('Failed to update reminders: ' + error.message);
    }
  }

  /**
   * Log one hour of work on a task
   */
  async logOneHour(
    task: Task,
    taskId: string,
    enforceReviewLock: boolean,
    onUpdateCallback: () => void
  ): Promise<void> {
    if (enforceReviewLock && this.isTaskLockedForReview(task)) {
      await this.showAlert(
        'This task is pending admin review. Time logging is locked until reviewed.',
        'info',
        'Task Locked'
      );
      return;
    }

    try {
      await this.taskService.addActualHours(taskId, 1);
      console.log('✅ One hour logged');
      onUpdateCallback();
    } catch (error: any) {
      console.error('❌ Error logging one hour:', error);
      throw new Error('Failed to log time: ' + error.message);
    }
  }

  /**
   * Submit task for admin review with detailed information
   */
  async submitTaskForReview(
    task: Task,
    employeeId: string,
    onUpdateCallback: () => void
  ): Promise<void> {
    if (this.isTaskLockedForReview(task) || task.status === 'done') {
      return;
    }

    const result = await Swal.fire({
      title: 'Submit Task for Review',
      html: `
        <div style="text-align:left; display:grid; gap:10px;">
          <label for="verification-notes" style="font-weight:600;">Completion Notes *</label>
          <textarea id="verification-notes" class="swal2-textarea" placeholder="Summarize what was completed"></textarea>
          <label for="verification-evidence" style="font-weight:600;">Evidence Links (optional)</label>
          <textarea id="verification-evidence" class="swal2-textarea" placeholder="One URL per line"></textarea>
          <label for="verification-time" style="font-weight:600;">Time Spent (hours) *</label>
          <input id="verification-time" type="number" min="0.5" step="0.5" class="swal2-input" value="${Math.max(1, task.actualHours || 0)}" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const notesInput = document.getElementById('verification-notes') as HTMLTextAreaElement | null;
        const evidenceInput = document.getElementById('verification-evidence') as HTMLTextAreaElement | null;
        const timeInput = document.getElementById('verification-time') as HTMLInputElement | null;

        const completionNotes = (notesInput?.value || '').trim();
        const evidence = (evidenceInput?.value || '')
          .split(/\r?\n/)
          .map(item => item.trim())
          .filter(Boolean);
        const timeSpent = Number(timeInput?.value || 0);

        if (!completionNotes) {
          Swal.showValidationMessage('Completion notes are required');
          return;
        }

        if (timeSpent <= 0) {
          Swal.showValidationMessage('Time spent must be greater than 0');
          return;
        }

        return { completionNotes, evidence, timeSpent };
      }
    });

    if (result.isConfirmed && result.value) {
      const { completionNotes, evidence, timeSpent } = result.value;

      try {
        const verification = {
          status: 'pending-approval',
          submittedBy: employeeId,
          submittedAt: new Date(),
          completionNotes,
          evidence,
          timeSpent
        };

        await this.taskService.submitTaskForApproval(task.id, employeeId, verification);

        await this.showAlert(
          'Task submitted for review. The admin will review and provide feedback.',
          'success',
          'Submitted'
        );

        console.log('✅ Task submitted for review');
        onUpdateCallback();
      } catch (error: any) {
        console.error('❌ Error submitting task:', error);
        await this.showAlert('Failed to submit task: ' + error.message, 'error', 'Submission Failed');
      }
    }
  }

  /**
   * Check if a task is locked for review
   */
  isTaskLockedForReview(task: Task): boolean {
    return task.status === 'pending-approval' || task.status === 'done';
  }

  /**
   * Parse comma-separated number list
   */
  private parseNumberList(value: string): number[] {
    if (!value || typeof value !== 'string') {
      return [];
    }

    return value
      .split(',')
      .map(item => Number(item.trim()))
      .filter(item => !Number.isNaN(item) && item > 0)
      .map(item => Math.round(item));
  }

  /**
   * Show alert dialog
   */
  private async showAlert(
    message: string,
    icon: 'success' | 'error' | 'info' = 'info',
    title = 'Notification'
  ): Promise<void> {
    await Swal.fire({
      icon,
      title,
      html: message,
      didOpen: (modalElement) => {
        const backdrop = document.querySelector('.swal2-backdrop') as HTMLElement | null;
        if (backdrop) {
          backdrop.style.zIndex = '1500';
        }
        modalElement.style.zIndex = '1501';
      }
    });
  }

  /**
   * Show text input dialog
   */
  private async showTextInput(title: string, message: string, defaultValue = ''): Promise<string | null> {
    const result = await Swal.fire({
      title,
      html: message,
      input: 'textarea',
      inputValue: defaultValue,
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (value.trim().length === 0) {
          return 'Please enter a value';
        }
        return null;
      }
    });

    return result.isConfirmed ? result.value : null;
  }

  /**
   * Get task priority score
   */
  getTaskScore(task: Task): number {
    return this.taskService.getTaskPriorityScore(task);
  }
}

