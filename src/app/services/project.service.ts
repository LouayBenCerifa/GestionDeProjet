import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where,
  getDocs,
  getDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Project, AdminDashboardStats, ProjectProgress } from '../interfaces/models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private firestore = inject(Firestore);

  /**
   * Create a new project (Admin only)
   */
  async createProject(
    adminId: string,
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'completionPercentage' | 'taskCount' | 'completedTaskCount'>
  ): Promise<string> {
    const projectsRef = collection(this.firestore, 'projects');

    const newProject = {
      ...projectData,
      adminId,
      completionPercentage: 0,
      taskCount: 0,
      completedTaskCount: 0,
      startDate: Timestamp.fromDate(new Date(projectData.startDate)),
      endDate: Timestamp.fromDate(new Date(projectData.endDate)),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(projectsRef, newProject);
    return docRef.id;
  }

  /**
   * Get all projects for an admin
   */
  getAdminProjects(adminId: string): Observable<Project[]> {
    const projectsRef = collection(this.firestore, 'projects');
    const q = query(projectsRef, where('adminId', '==', adminId));

    return collectionData(q, { idField: 'id' }).pipe(
      map((projects: any[]) =>
        projects.map((p) => ({
          ...p,
          startDate: p.startDate?.toDate ? p.startDate.toDate() : p.startDate,
          endDate: p.endDate?.toDate ? p.endDate.toDate() : p.endDate,
          createdAt: p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt,
          updatedAt: p.updatedAt?.toDate ? p.updatedAt.toDate() : p.updatedAt,
        }))
      )
    ) as Observable<Project[]>;
  }

  /**
   * Get all projects assigned to an employee
   */
  getEmployeeProjects(employeeId: string): Observable<Project[]> {
    const projectsRef = collection(this.firestore, 'projects');
    const q = query(projectsRef, where('teamMembers', 'array-contains', employeeId));

    return collectionData(q, { idField: 'id' }).pipe(
      map((projects: any[]) =>
        projects.map((p) => ({
          ...p,
          startDate: p.startDate?.toDate ? p.startDate.toDate() : p.startDate,
          endDate: p.endDate?.toDate ? p.endDate.toDate() : p.endDate,
          createdAt: p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt,
          updatedAt: p.updatedAt?.toDate ? p.updatedAt.toDate() : p.updatedAt,
        }))
      )
    ) as Observable<Project[]>;
  }

  /**
   * Get single project by ID
   */
  getProject(projectId: string): Observable<Project | null> {
    const projectRef = doc(this.firestore, 'projects', projectId);

    return collectionData(query(collection(this.firestore, 'projects'), where('__name__', '==', projectId)), {
      idField: 'id',
    }).pipe(
      map((projects: any[]) =>
        projects.length > 0
          ? {
              ...projects[0],
              startDate: projects[0].startDate?.toDate
                ? projects[0].startDate.toDate()
                : projects[0].startDate,
              endDate: projects[0].endDate?.toDate
                ? projects[0].endDate.toDate()
                : projects[0].endDate,
              createdAt: projects[0].createdAt?.toDate
                ? projects[0].createdAt.toDate()
                : projects[0].createdAt,
              updatedAt: projects[0].updatedAt?.toDate
                ? projects[0].updatedAt.toDate()
                : projects[0].updatedAt,
            }
          : null
      )
    ) as Observable<Project | null>;
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const projectRef = doc(this.firestore, 'projects', projectId);

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(updates.startDate));
    }

    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(updates.endDate));
    }

    await updateDoc(projectRef, updateData);
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    const projectRef = doc(this.firestore, 'projects', projectId);
    await deleteDoc(projectRef);
  }

  /**
   * Add employee to project
   */
  async addEmployeeToProject(projectId: string, employeeId: string): Promise<void> {
    const projectRef = doc(this.firestore, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
      const teamMembers = projectSnap.data()['teamMembers'] || [];
      if (!teamMembers.includes(employeeId)) {
        teamMembers.push(employeeId);
        await updateDoc(projectRef, { teamMembers });
      }
    }
  }

  /**
   * Remove employee from project
   */
  async removeEmployeeFromProject(projectId: string, employeeId: string): Promise<void> {
    const projectRef = doc(this.firestore, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
      const teamMembers = projectSnap.data()['teamMembers'] || [];
      const updatedMembers = teamMembers.filter((id: string) => id !== employeeId);
      await updateDoc(projectRef, { teamMembers: updatedMembers });
    }
  }

  /**
   * Update project progress based on tasks
   */
  async updateProjectProgress(projectId: string): Promise<void> {
    const tasksRef = collection(this.firestore, 'tasks');
    const q = query(tasksRef, where('projectId', '==', projectId));
    const tasksSnap = await getDocs(q);

    const totalTasks = tasksSnap.size;
    const completedTasks = tasksSnap.docs.filter((doc) => doc.data()['status'] === 'done').length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const projectRef = doc(this.firestore, 'projects', projectId);
    await updateDoc(projectRef, {
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      completionPercentage,
    });
  }

  /**
   * Get admin dashboard statistics
   */
  async getAdminDashboardStats(adminId: string): Promise<AdminDashboardStats> {
    const projectsRef = collection(this.firestore, 'projects');
    const projectsQuery = query(projectsRef, where('adminId', '==', adminId));
    const projectsSnap = await getDocs(projectsQuery);

    const totalProjects = projectsSnap.size;
    const activeProjects = projectsSnap.docs.filter((doc) => {
      const status = doc.data()['status'];
      return status === 'in-progress' || status === 'planning';
    }).length;

    const tasksRef = collection(this.firestore, 'tasks');
    const tasksQuery = query(tasksRef);
    const tasksSnap = await getDocs(tasksQuery);

    const totalTasks = tasksSnap.size;
    const completedTasks = tasksSnap.docs.filter((doc) => doc.data()['status'] === 'done').length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const usersRef = collection(this.firestore, 'users');
    const usersQuery = query(usersRef, where('role', '==', 'employee'));
    const usersSnap = await getDocs(usersQuery);
    const activeEmployees = usersSnap.size;

    const projectProgress: ProjectProgress[] = projectsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        projectId: doc.id,
        projectName: data['name'],
        progress: data['completionPercentage'] || 0,
        tasksDone: data['completedTaskCount'] || 0,
        tasksTotal: data['taskCount'] || 0,
        startDate: data['startDate']?.toDate ? data['startDate'].toDate() : data['startDate'],
        endDate: data['endDate']?.toDate ? data['endDate'].toDate() : data['endDate'],
      };
    });

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      taskCompletionRate,
      activeEmployees,
      projectProgress,
    };
  }
}
