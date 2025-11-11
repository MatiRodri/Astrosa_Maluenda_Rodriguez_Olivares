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
  private readonly storage: Storage | null = this.resolveStorage();
  private readonly recordsSubject = new BehaviorSubject<OfflineCategoryRecord[]>(this.loadRecords());

  readonly records$ = this.recordsSubject.asObservable();

  saveCategory(category: InstructionCategory): void {
    const copy = this.cloneCategory(category);
    const nextRecords = this.recordsSubject.value.filter(record => record.id !== category.id);
    nextRecords.push({ id: category.id, downloadedAt: Date.now(), category: copy });
    this.persistRecords(nextRecords);
    this.recordsSubject.next(nextRecords);
  }

  removeCategory(categoryId: number): void {
    const nextRecords = this.recordsSubject.value.filter(record => record.id !== categoryId);
    this.persistRecords(nextRecords);
    this.recordsSubject.next(nextRecords);
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

  private loadRecords(): OfflineCategoryRecord[] {
    if (!this.storage) {
      return [];
    }
    try {
      const stored = this.storage.getItem(this.storageKey);
      if (!stored) {
        return [];
      }
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

  private persistRecords(records: OfflineCategoryRecord[]): void {
    if (!this.storage) {
      return;
    }
    try {
      const serialized = JSON.stringify(records);
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
}
