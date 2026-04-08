import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly app = inject(FirebaseApp);

  private get storage() {
    return getStorage(this.app);
  }

  async uploadFile(path: string, file: Blob | Uint8Array | ArrayBuffer): Promise<string> {
    const fileRef = ref(this.storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  async getFileUrl(path: string): Promise<string> {
    const fileRef = ref(this.storage, path);
    return getDownloadURL(fileRef);
  }
}
