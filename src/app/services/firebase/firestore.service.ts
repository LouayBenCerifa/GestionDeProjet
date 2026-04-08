import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private readonly firestore = inject(Firestore);

  get instance(): Firestore {
    return this.firestore;
  }

  collection<T = Record<string, unknown>>(path: string) {
    return collection(this.firestore, path) as any;
  }

  doc<T = Record<string, unknown>>(path: string, id: string) {
    return doc(this.firestore, path, id) as any;
  }
}
