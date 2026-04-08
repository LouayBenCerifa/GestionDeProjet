import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  QueryDocumentSnapshot,
} from '@angular/fire/firestore';
import { Task, TaskVerification, User } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class EmployeeDashboardDataService {
  private firestore = inject(Firestore);

  async getEmployeeTasksDirect(employeeId: string): Promise<Task[]> {
    const tasksRef = collection(this.firestore, 'tasks');
    const tasksQuery = query(tasksRef, where('assignedTo', '==', employeeId), orderBy('deadline', 'asc'));
    const snapshot = await getDocs(tasksQuery);

    return snapshot.docs.map((snapshotDoc: QueryDocumentSnapshot) => {
      const data = snapshotDoc.data();
      return {
        id: snapshotDoc.id,
        projectId: data['projectId'] || '',
        title: data['title'] || '',
        description: data['description'] || '',
        assignedTo: data['assignedTo'] || '',
        assignedBy: data['assignedBy'] || '',
        deadline: this.formatDate(data['deadline']),
        priority: data['priority'] || 'medium',
        status: data['status'] || 'todo',
        completionPercentage: data['completionPercentage'] || 0,
        comments: data['comments'] || [],
        verification: this.parseVerification(data['verification']),
        createdAt: this.formatDate(data['createdAt']),
        updatedAt: this.formatDate(data['updatedAt']),
      } as Task;
    });
  }

  async getAdmins(): Promise<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const adminsQuery = query(usersRef, where('role', '==', 'admin'));
    const querySnapshot = await getDocs(adminsQuery);

    const admins: User[] = [];
    querySnapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      admins.push({
        id: snapshotDoc.id,
        email: data['email'] || '',
        name: data['name'] || '',
        role: data['role'] || 'admin',
        createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
      } as User);
    });

    return admins;
  }

  async getEmployeeConversations(employeeId: string, employeeName: string): Promise<Array<any>> {
    const conversationsRef = collection(this.firestore, 'conversations');
    const conversationsQuery = query(
      conversationsRef,
      where('employeeId', '==', employeeId),
      orderBy('lastMessageTime', 'desc')
    );

    const snapshot = await getDocs(conversationsQuery);
    return snapshot.docs.map((snapshotDoc) => {
      const data = snapshotDoc.data();
      return {
        id: snapshotDoc.id,
        adminId: data['adminId'] || '',
        employeeId: data['employeeId'] || employeeId,
        adminName: data['adminName'] || 'Admin',
        employeeName: data['employeeName'] || employeeName,
        lastMessage: data['lastMessage'] || 'No messages yet',
        lastMessageTime: data['lastMessageTime']?.toDate
          ? data['lastMessageTime'].toDate()
          : data['lastMessageTime'],
        unreadCount: data['unreadCount'] || 0,
      };
    });
  }

  async getEmployeeInfo(employeeId: string): Promise<any | null> {
    const usersRef = collection(this.firestore, 'users');
    const userQuery = query(usersRef, where('uid', '==', employeeId));
    const querySnapshot = await getDocs(userQuery);

    if (querySnapshot.docs.length === 0) {
      return null;
    }

    const data = querySnapshot.docs[0].data();
    return {
      department: data['department'] || 'Not specified',
      position: data['position'] || 'Employee',
      joinDate: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(),
      skills: data['skills'] || [],
    };
  }

  async updateEmployeeSkills(employeeId: string, skills: string[]): Promise<void> {
    const usersRef = collection(this.firestore, 'users');
    const userQuery = query(usersRef, where('uid', '==', employeeId));
    const snapshot = await getDocs(userQuery);

    if (snapshot.docs.length === 0) {
      throw new Error('Employee profile not found');
    }

    const userDoc = snapshot.docs[0];
    const userRef = doc(this.firestore, 'users', userDoc.id);

    await setDoc(
      userRef,
      {
        ...userDoc.data(),
        skills,
      },
      { merge: true }
    );
  }

  private formatDate(dateValue: any): Date {
    if (!dateValue) return new Date();

    if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
      return dateValue.toDate();
    }

    if (dateValue instanceof Date) {
      return dateValue;
    }

    if (typeof dateValue === 'string') {
      const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
      if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]) - 1;
        const day = Number(dateOnlyMatch[3]);
        return new Date(year, month, day, 23, 59, 59, 999);
      }

      const parsed = new Date(dateValue);
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    return new Date();
  }

  private parseVerification(value: any): TaskVerification | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return {
      submittedBy: value['submittedBy'] || '',
      submittedAt: this.formatDate(value['submittedAt']),
      status: value['status'] || 'pending-approval',
      completionNotes: value['completionNotes'] || '',
      evidence: Array.isArray(value['evidence']) ? value['evidence'].map((item: any) => String(item)) : [],
      timeSpent: Number(value['timeSpent'] || 0),
      approvedBy: value['approvedBy'] || undefined,
      approvedAt: value['approvedAt'] ? this.formatDate(value['approvedAt']) : undefined,
      rejectionReason: value['rejectionReason'] || undefined,
    };
  }
}

