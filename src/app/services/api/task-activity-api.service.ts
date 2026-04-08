import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { TaskActivityEntry } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class TaskActivityService {
  private firestore = inject(Firestore);

  async logEvent(
    entry: Omit<TaskActivityEntry, 'id' | 'createdAt'>
  ): Promise<string> {
    const activityRef = collection(this.firestore, 'taskActivity');
    const docRef = await addDoc(activityRef, {
      ...entry,
      createdAt: Timestamp.now(),
    });

    return docRef.id;
  }

  getTaskActivity(taskId: string): Observable<TaskActivityEntry[]> {
    const activityRef = collection(this.firestore, 'taskActivity');
    const activityQuery = query(
      activityRef,
      where('taskId', '==', taskId),
      orderBy('createdAt', 'desc')
    );

    return new Observable<TaskActivityEntry[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        activityQuery,
        (snapshot) => {
          const items = snapshot.docs.map((snapshotDoc) => {
            const data = snapshotDoc.data() as any;
            return {
              id: snapshotDoc.id,
              ...data,
              createdAt: data['createdAt']?.toDate
                ? data['createdAt'].toDate()
                : new Date(data['createdAt'] || new Date()),
            } as TaskActivityEntry;
          });
          subscriber.next(items);
        },
        (error) => subscriber.error(error)
      );

      return () => unsubscribe();
    });
  }
}

