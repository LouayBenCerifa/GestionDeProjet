import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, orderBy, query, where } from '@angular/fire/firestore';
import { Task, User } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardDataService {
  private firestore = inject(Firestore);

  async getAdminTasks(): Promise<Task[]> {
    const tasksRef = collection(this.firestore, 'tasks');
    const querySnapshot = await getDocs(tasksRef);

    const tasks: Task[] = [];
    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      tasks.push({
        id: snapshotDoc.id,
        projectId: data['projectId'] || '',
        title: data['title'] || '',
        description: data['description'] || '',
        assignedTo: data['assignedTo'] || '',
        assignedBy: data['assignedBy'] || '',
        deadline: data['deadline']?.toDate ? data['deadline'].toDate() : data['deadline'],
        priority: data['priority'] || 'medium',
        status: data['status'] || 'todo',
        completionPercentage: data['completionPercentage'] || 0,
        comments: data['comments'] || [],
        verification: this.parseVerificationData(data['verification']),
        createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
        updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(),
      } as Task);
    });

    return tasks;
  }

  async getEmployees(): Promise<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const usersQuery = query(usersRef, where('role', '==', 'employee'));
    const querySnapshot = await getDocs(usersQuery);

    const employees: User[] = [];
    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      employees.push({
        id: snapshotDoc.id,
        email: data['email'] || '',
        name: data['name'] || '',
        role: data['role'] || 'employee',
        createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
      } as User);
    });

    return employees;
  }

  async getAdminConversations(adminId: string): Promise<Array<any>> {
    const conversationsRef = collection(this.firestore, 'conversations');
    const conversationsQuery = query(
      conversationsRef,
      where('adminId', '==', adminId),
      orderBy('lastMessageTime', 'desc')
    );

    const snapshot = await getDocs(conversationsQuery);
    return snapshot.docs.map((snapshotDoc) => {
      const data = snapshotDoc.data();
      return {
        id: snapshotDoc.id,
        adminId: data['adminId'] || adminId,
        employeeId: data['employeeId'] || '',
        adminName: data['adminName'] || 'Admin',
        employeeName: data['employeeName'] || 'Employee',
        lastMessage: data['lastMessage'] || 'No messages yet',
        lastMessageTime: data['lastMessageTime']?.toDate
          ? data['lastMessageTime'].toDate()
          : data['lastMessageTime'],
        unreadCount: data['unreadCount'] || 0,
      };
    });
  }

  private parseVerificationData(value: any): any {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return {
      ...value,
      submittedAt: value['submittedAt']?.toDate ? value['submittedAt'].toDate() : value['submittedAt'],
      approvedAt: value['approvedAt']?.toDate ? value['approvedAt'].toDate() : value['approvedAt'],
      evidence: Array.isArray(value['evidence']) ? value['evidence'] : [],
      timeSpent: Number(value['timeSpent'] || 0),
    };
  }
}

