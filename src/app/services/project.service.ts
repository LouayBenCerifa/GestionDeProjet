import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
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
import { Observable, from } from 'rxjs';
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
    projectData: any
  ): Promise<string> {
    try {
      console.log('📦 Creating project with data:', projectData);
      
      const projectsRef = collection(this.firestore, 'projects');

      // Convert dates properly
      let startDate: Date;
      let endDate: Date;
      
      if (projectData.startDate instanceof Date) {
        startDate = projectData.startDate;
      } else if (typeof projectData.startDate === 'string') {
        startDate = new Date(projectData.startDate);
      } else {
        startDate = new Date();
      }
      
      if (projectData.endDate instanceof Date) {
        endDate = projectData.endDate;
      } else if (typeof projectData.endDate === 'string') {
        endDate = new Date(projectData.endDate);
      } else {
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const newProject = {
        name: projectData.name || 'Untitled Project',
        description: projectData.description || '',
        status: projectData.status || 'planning',
        adminId: adminId,
        teamMembers: projectData.teamMembers || [],
        completionPercentage: 0,
        taskCount: 0,
        completedTaskCount: 0,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(projectsRef, newProject);
      console.log('✅ Project created with ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating project:', error);
      throw error;
    }
  }

  /**
   * Get all projects for an admin - USING PROMISE
   */
  async getAdminProjectsPromise(adminId: string): Promise<Project[]> {
    try {
      console.log('🔍 Getting admin projects for:', adminId);
      
      if (!this.firestore) {
        console.error('❌ Firestore instance is not available');
        return [];
      }
      
      const projectsRef = collection(this.firestore, 'projects');
      console.log('📁 Projects ref created');
      
      const q = query(projectsRef, where('adminId', '==', adminId));
      console.log('🔎 Query created');
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Query snapshot received:', querySnapshot.size, 'documents');
      
      const projects: Project[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Convert timestamps to dates
        const startDate = data['startDate']?.toDate 
          ? data['startDate'].toDate() 
          : new Date(data['startDate'] || new Date());
        
        const endDate = data['endDate']?.toDate 
          ? data['endDate'].toDate() 
          : new Date(data['endDate'] || new Date());
        
        const createdAt = data['createdAt']?.toDate 
          ? data['createdAt'].toDate() 
          : new Date(data['createdAt'] || new Date());
        
        const updatedAt = data['updatedAt']?.toDate 
          ? data['updatedAt'].toDate() 
          : new Date(data['updatedAt'] || new Date());
        
        const project: Project = {
          id: doc.id,
          name: data['name'] || 'Unnamed Project',
          description: data['description'] || '',
          status: data['status'] || 'planning',
          adminId: data['adminId'] || adminId,
          teamMembers: data['teamMembers'] || [],
          completionPercentage: data['completionPercentage'] || 0,
          taskCount: data['taskCount'] || 0,
          completedTaskCount: data['completedTaskCount'] || 0,
          startDate: startDate,
          endDate: endDate,
          createdAt: createdAt,
          updatedAt: updatedAt,
        };
        
        projects.push(project);
      });
      
      console.log('📥 Projects loaded:', projects.length);
      return projects;
      
    } catch (error) {
      console.error('❌ Error in getAdminProjectsPromise:', error);
      console.error('Full error:', error);
      return [];
    }
  }

  /**
   * Observable version that wraps the promise
   */
  getAdminProjects(adminId: string): Observable<Project[]> {
    return from(this.getAdminProjectsPromise(adminId));
  }

  /**
   * Get all projects assigned to an employee - USING PROMISE
   */
  async getEmployeeProjectsPromise(employeeId: string): Promise<Project[]> {
    try {
      console.log('🔍 Getting employee projects for:', employeeId);
      
      const projectsRef = collection(this.firestore, 'projects');
      const q = query(projectsRef, where('teamMembers', 'array-contains', employeeId));
      
      const querySnapshot = await getDocs(q);
      const projects: Project[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const project: Project = {
          id: doc.id,
          name: data['name'] || 'Unnamed Project',
          description: data['description'] || '',
          status: data['status'] || 'planning',
          adminId: data['adminId'],
          teamMembers: data['teamMembers'] || [],
          completionPercentage: data['completionPercentage'] || 0,
          taskCount: data['taskCount'] || 0,
          completedTaskCount: data['completedTaskCount'] || 0,
          startDate: data['startDate']?.toDate ? data['startDate'].toDate() : new Date(data['startDate'] || new Date()),
          endDate: data['endDate']?.toDate ? data['endDate'].toDate() : new Date(data['endDate'] || new Date()),
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt'] || new Date()),
          updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt'] || new Date()),
        };
        
        projects.push(project);
      });
      
      console.log('📥 Employee projects loaded:', projects.length);
      return projects;
      
    } catch (error) {
      console.error('❌ Error getting employee projects:', error);
      return [];
    }
  }

  /**
   * Observable version for employee projects
   */
  getEmployeeProjects(employeeId: string): Observable<Project[]> {
    return from(this.getEmployeeProjectsPromise(employeeId));
  }

  /**
   * Get single project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    try {
      const projectRef = doc(this.firestore, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const data = projectSnap.data();
        return {
          id: projectSnap.id,
          name: data['name'] || 'Unnamed Project',
          description: data['description'] || '',
          status: data['status'] || 'planning',
          adminId: data['adminId'],
          teamMembers: data['teamMembers'] || [],
          completionPercentage: data['completionPercentage'] || 0,
          taskCount: data['taskCount'] || 0,
          completedTaskCount: data['completedTaskCount'] || 0,
          startDate: data['startDate']?.toDate ? data['startDate'].toDate() : new Date(data['startDate'] || new Date()),
          endDate: data['endDate']?.toDate ? data['endDate'].toDate() : new Date(data['endDate'] || new Date()),
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt'] || new Date()),
          updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt'] || new Date()),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
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
    try {
      console.log('📊 Getting admin dashboard stats for:', adminId);
      
      // Get projects
      const projectsRef = collection(this.firestore, 'projects');
      const projectsQuery = query(projectsRef, where('adminId', '==', adminId));
      const projectsSnap = await getDocs(projectsQuery);

      const totalProjects = projectsSnap.size;
      const activeProjects = projectsSnap.docs.filter((doc) => {
        const status = doc.data()['status'];
        return status === 'in-progress' || status === 'planning';
      }).length;

      console.log('📈 Projects - Total:', totalProjects, 'Active:', activeProjects);

      // Get tasks
      const tasksRef = collection(this.firestore, 'tasks');
      const tasksQuery = query(tasksRef);
      const tasksSnap = await getDocs(tasksQuery);

      const totalTasks = tasksSnap.size;
      const completedTasks = tasksSnap.docs.filter((doc) => doc.data()['status'] === 'done').length;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      console.log('📋 Tasks - Total:', totalTasks, 'Completed:', completedTasks, 'Rate:', taskCompletionRate);

      // Get employees
      const usersRef = collection(this.firestore, 'users');
      const usersQuery = query(usersRef, where('role', '==', 'employee'));
      const usersSnap = await getDocs(usersQuery);
      const activeEmployees = usersSnap.size;

      console.log('👥 Employees - Active:', activeEmployees);

      // Get project progress
      const projectProgress: ProjectProgress[] = projectsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          projectId: doc.id,
          projectName: data['name'] || 'Unnamed Project',
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
    } catch (error) {
      console.error('Error getting admin dashboard stats:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        taskCompletionRate: 0,
        activeEmployees: 0,
        projectProgress: [],
      };
    }
  }
}