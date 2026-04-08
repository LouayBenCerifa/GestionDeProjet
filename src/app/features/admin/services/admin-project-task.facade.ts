import { Injectable, inject } from '@angular/core';
import { ProjectService } from '../../../services/api/project-api.service';
import { TaskService } from '../../../services/api/task-api.service';
import { DashboardDialogService } from '../../../services/dashboard/dashboard-dialog.service';
import { DashboardUtilsService } from '../../../services/dashboard/dashboard-utils.service';
import { Project, Task, User } from '../../../models/models';

@Injectable({
  providedIn: 'root'
})
export class AdminProjectTaskFacade {
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private dashboardDialogService = inject(DashboardDialogService);
  private dashboardUtilsService = inject(DashboardUtilsService);

  async createProject(adminId: string, formValue: any, teamMembers: string[]): Promise<void> {
    const projectData = {
      name: formValue.name,
      description: formValue.description,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      status: formValue.status || 'planning',
      adminId,
      teamMembers
    };

    await this.projectService.createProject(adminId, projectData);
  }

  async createTestProject(adminId: string): Promise<void> {
    const testProject = {
      name: 'Test Project ' + new Date().getTime(),
      description: 'This is a test project created for debugging',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'planning',
      adminId,
      teamMembers: []
    };

    await this.projectService.createProject(adminId, testProject);
  }

  async createTask(adminId: string, formValue: any): Promise<void> {
    const {
      projectId,
      assignedTo,
      reminderOffsetsMinutes,
      effortPoints,
      estimatedHours,
      ...taskData
    } = formValue;

    const parsedReminderOffsets = this.dashboardUtilsService.parseNumberList(reminderOffsetsMinutes);

    await this.taskService.createTask(projectId, adminId, assignedTo, {
      ...taskData,
      assignedBy: adminId,
      status: 'todo',
      completionPercentage: 0,
      effortPoints: Number(effortPoints || 0),
      estimatedHours: Number(estimatedHours || 0),
      actualHours: 0,
      reminderOffsetsMinutes: parsedReminderOffsets,
    });
  }

  async deleteProject(project: Project): Promise<boolean> {
    const taskCount = project.taskCount || 0;
    const confirmed = await this.dashboardDialogService.showConfirm(
      `Delete "${project.name}"? This will also delete ${taskCount} related task(s).`,
      'Delete Project'
    );

    if (!confirmed) {
      return false;
    }

    await this.projectService.deleteProject(project.id);
    return true;
  }

  async changeProjectStatus(project: Project, nextStatus: Project['status']): Promise<void> {
    await this.projectService.updateProject(project.id, { status: nextStatus });
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const confirmed = await this.dashboardDialogService.showConfirm(
      'Are you sure you want to delete this task?',
      'Delete Task'
    );

    if (!confirmed) {
      return false;
    }

    await this.taskService.deleteTask(taskId);
    return true;
  }

  async updateProjectTeam(project: Project, employees: User[]): Promise<boolean> {
    if (!employees.length) {
      await this.dashboardDialogService.showAlert('No employees available to assign.', 'info', 'No Team Members');
      return false;
    }

    const currentTeam = new Set(project.teamMembers || []);
    const optionsText = employees
      .map((employee, index) => {
        const marker = currentTeam.has(employee.id) ? '✓' : ' ';
        const label = employee.name || employee.email || employee.id;
        return `${index + 1}. [${marker}] ${label}`;
      })
      .join('\n');

    const currentSelectionIndices = employees
      .map((employee, index) => currentTeam.has(employee.id) ? String(index + 1) : null)
      .filter(Boolean)
      .join(',');

    const input = await this.dashboardDialogService.showTextInput(
      `Edit team members for "${project.name}"`,
      `Choose employee numbers (comma separated):\n${optionsText}`,
      currentSelectionIndices,
      'textarea'
    );

    if (input === null) {
      return false;
    }

    const selectedTeamMembers = this.dashboardUtilsService.parseEmployeeSelectionInput(input, employees);
    await this.projectService.updateProject(project.id, { teamMembers: selectedTeamMembers });
    return true;
  }

  async applyBulkUpdate(
    selectedIds: string[],
    updates: any,
    actorId: string,
    actorName: string
  ): Promise<void> {
    await this.taskService.bulkUpdateTasks(selectedIds, updates, actorId, actorName, 'admin');
  }

  async setTaskReminders(task: Task, actorId: string, actorName: string): Promise<boolean> {
    const currentValue = (task.reminderOffsetsMinutes || []).join(', ');
    const input = await this.dashboardDialogService.showTextInput(
      'Reminders',
      'Enter reminder offsets in minutes (comma separated):',
      currentValue
    );

    if (input === null) {
      return false;
    }

    const reminderOffsets = this.dashboardUtilsService.parseNumberList(input);
    await this.taskService.setTaskReminders(task.id, reminderOffsets, actorId, actorName, 'admin');
    return true;
  }

  async logOneHour(taskId: string): Promise<void> {
    await this.taskService.addActualHours(taskId, 1);
  }
}

