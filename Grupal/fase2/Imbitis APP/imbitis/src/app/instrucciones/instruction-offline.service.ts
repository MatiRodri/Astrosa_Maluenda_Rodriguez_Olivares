import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { InstructionCategory, InstructionStep } from './instructions.service';

interface OfflineCategoryRecord {
  id: number;
  downloadedAt: number;
  category: InstructionCategory;
}

@Injectable({ providedIn: 'root' })
export class InstructionOfflineService {
  private readonly storageKey = 'offlineInstructionCategories';
  private readonly dbName = 'imbitis-offline';
  private readonly dbStoreName = 'instruction-records';
  private readonly storage: Storage | null = this.resolveStorage();
  private readonly recordsSubject = new BehaviorSubject<OfflineCategoryRecord[]>([]);
  private readonly ready: Promise<void>;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private readonly assetCache = new Map<string, string>();

  readonly records$ = this.recordsSubject.asObservable();

  constructor() {
    this.ready = this.initializeRecords();
  }

  async whenReady(): Promise<void> {
    await this.ready;
  }

  async saveCategory(category: InstructionCategory): Promise<void> {
    await this.whenReady();
    const copy = await this.cloneCategoryWithAssets(category);
    const nextRecords = this.recordsSubject.value.filter(record => record.id !== category.id);
    nextRecords.push({ id: category.id, downloadedAt: Date.now(), category: copy });
    this.recordsSubject.next(nextRecords);
    await this.persistRecords(nextRecords);
  }

  async removeCategory(categoryId: number): Promise<void> {
    await this.whenReady();
    const nextRecords = this.recordsSubject.value.filter(record => record.id !== categoryId);
    this.recordsSubject.next(nextRecords);
    await this.persistRecords(nextRecords);
  }

  hasCategory(categoryId: number): boolean {
    return this.recordsSubject.value.some(record => record.id === categoryId);
  }

  getDownloadedAt(categoryId: number): number | null {
    const record = this.recordsSubject.value.find(item => item.id === categoryId);
    return record?.downloadedAt ?? null;
  }

  getOfflineCategories(): InstructionCategory[] {
    return this.recordsSubject.value.map(record => this.cloneCategory(record.category));
  }

  private resolveStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window?.localStorage) {
        return null;
      }
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private async initializeRecords(): Promise<void> {
    try {
      const records = await this.loadRecords();
      this.recordsSubject.next(records);
    } catch {
      this.recordsSubject.next([]);
    }
  }

  private async loadRecords(): Promise<OfflineCategoryRecord[]> {
    const stored = await this.readPersistedData();
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map(item => this.normalizeRecord(item))
        .filter((record): record is OfflineCategoryRecord => record !== null);
    } catch {
      return [];
    }
  }

  private async readPersistedData(): Promise<string | null> {
    const fromIndexedDb = await this.readFromIndexedDb();
    if (typeof fromIndexedDb === 'string') {
      return fromIndexedDb;
    }
    if (!this.storage) {
      return null;
    }
    try {
      const stored = this.storage.getItem(this.storageKey);
      if (stored) {
        await this.writeToIndexedDb(stored);
        return stored;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async persistRecords(records: OfflineCategoryRecord[]): Promise<void> {
    const serialized = JSON.stringify(records);
    const stored = await this.writeToIndexedDb(serialized);
    if (!stored) {
      this.persistToLocalStorage(serialized);
    }
  }

  private async getIndexedDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase | null>(resolve => {
        const request = window.indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.dbStoreName)) {
            db.createObjectStore(this.dbStoreName);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      });
    }
    return this.dbPromise;
  }

  private async readFromIndexedDb(): Promise<string | null> {
    try {
      const db = await this.getIndexedDb();
      if (!db) {
        return null;
      }
      return await new Promise<string | null>(resolve => {
        const tx = db.transaction([this.dbStoreName], 'readonly');
        const store = tx.objectStore(this.dbStoreName);
        const request = store.get(this.storageKey);
        request.onsuccess = () => {
          const value = request.result;
          resolve(typeof value === 'string' ? value : null);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async writeToIndexedDb(serialized: string): Promise<boolean> {
    try {
      const db = await this.getIndexedDb();
      if (!db) {
        return false;
      }
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([this.dbStoreName], 'readwrite');
        const store = tx.objectStore(this.dbStoreName);
        const request = store.put(serialized, this.storageKey);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('No se pudo guardar el registro.'));
      });
      return true;
    } catch {
      return false;
    }
  }

  private persistToLocalStorage(serialized: string): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey, serialized);
    } catch {
      // ignore quota/storage errors to avoid blocking the UI
    }
  }

  private normalizeRecord(value: any): OfflineCategoryRecord | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const id = Number(value.id);
    if (!Number.isFinite(id)) {
      return null;
    }
    const downloadedAt =
      typeof value.downloadedAt === 'number'
        ? value.downloadedAt
        : Number(value.downloadedAt) || Date.now();
    const category = this.normalizeCategory((value as any).category);
    if (!category) {
      return null;
    }
    return { id, downloadedAt, category };
  }

  private normalizeCategory(value: any): InstructionCategory | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const id = Number(value.id);
    if (!Number.isFinite(id)) {
      return null;
    }
    const tags = Array.isArray(value.tags)
      ? value.tags.filter((tag: any): tag is string => typeof tag === 'string')
      : [];
    const steps = Array.isArray(value.steps)
      ? value.steps
          .map((step: unknown) => this.normalizeStep(step))
          .filter((step: InstructionStep | null): step is InstructionStep => step !== null)
      : [];
    const children = Array.isArray(value.children)
      ? value.children
          .map((child: unknown) => this.normalizeCategory(child))
          .filter((child: InstructionCategory | null): child is InstructionCategory => child !== null)
      : [];
    return {
      id,
      name: typeof value.name === 'string' ? value.name : `Categoria ${id}`,
      description: typeof value.description === 'string' ? value.description : '',
      iconUrl: typeof value.iconUrl === 'string' ? value.iconUrl : undefined,
      tags,
      steps,
      children,
      viewCount: Number(value.viewCount) || 0,
      dangerLevel: Number(value.dangerLevel) || 1,
      riskScore: Number(value.riskScore) || 0,
    };
  }

  private normalizeStep(value: any): InstructionStep | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const id = Number(value.id);
    if (!Number.isFinite(id)) {
      return null;
    }
    return {
      id,
      order: Number(value.order) || 0,
      text: typeof value.text === 'string' ? value.text : '',
      imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : undefined,
      audioUrl: typeof value.audioUrl === 'string' ? value.audioUrl : undefined,
      localImageSrc: typeof value.localImageSrc === 'string' ? value.localImageSrc : undefined,
      localAudioSrc: typeof value.localAudioSrc === 'string' ? value.localAudioSrc : undefined,
    };
  }

  private cloneCategory(category: InstructionCategory): InstructionCategory {
    return {
      ...category,
      tags: [...category.tags],
      steps: category.steps.map(step => ({ ...step })),
      children: category.children.map(child => this.cloneCategory(child)),
    };
  }

  private async cloneCategoryWithAssets(category: InstructionCategory): Promise<InstructionCategory> {
    const steps = await Promise.all(category.steps.map(step => this.cloneStepWithAssets(step)));
    const children = await Promise.all(category.children.map(child => this.cloneCategoryWithAssets(child)));
    return {
      ...category,
      tags: [...category.tags],
      steps,
      children,
    };
  }

  private async cloneStepWithAssets(step: InstructionStep): Promise<InstructionStep> {
    const [imageData, audioData] = await Promise.all([
      this.downloadAsset(step.localImageSrc ?? step.imageUrl),
      this.downloadAsset(step.localAudioSrc ?? step.audioUrl),
    ]);

    return {
      ...step,
      localImageSrc: imageData ?? step.localImageSrc,
      localAudioSrc: audioData ?? step.localAudioSrc,
    };
  }

  private async downloadAsset(source?: string): Promise<string | undefined> {
    if (!source) {
      return undefined;
    }
    if (source.startsWith('data:')) {
      return source;
    }
    if (this.assetCache.has(source)) {
      return this.assetCache.get(source);
    }
    try {
      const response = await fetch(source);
      if (!response?.ok) {
        return undefined;
      }
      const blob = await response.blob();
      const dataUrl = await this.blobToDataUrl(blob);
      this.assetCache.set(source, dataUrl);
      return dataUrl;
    } catch {
      return undefined;
    }
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('No fue posible leer el recurso.'));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error('Error desconocido al leer el recurso.'));
      reader.readAsDataURL(blob);
    });
  }
}
