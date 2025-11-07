import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type FavoriteSet = Set<number>;

@Injectable({ providedIn: 'root' })
export class InstructionFavoritesService {
  private readonly storageKey = 'instructionFavorites';
  private readonly favoritesSubject = new BehaviorSubject<FavoriteSet>(this.loadFavorites());

  readonly favorites$ = this.favoritesSubject.asObservable();

  toggleFavorite(categoryId: number): void {
    const current = new Set(this.favoritesSubject.value);
    if (current.has(categoryId)) {
      current.delete(categoryId);
    } else {
      current.add(categoryId);
    }
    this.persistFavorites(current);
    this.favoritesSubject.next(current);
  }

  setFavorite(categoryId: number, favorite: boolean): void {
    const current = new Set(this.favoritesSubject.value);
    if (favorite) {
      current.add(categoryId);
    } else {
      current.delete(categoryId);
    }
    this.persistFavorites(current);
    this.favoritesSubject.next(current);
  }

  isFavorite(categoryId: number): boolean {
    return this.favoritesSubject.value.has(categoryId);
  }

  private loadFavorites(): FavoriteSet {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return new Set();
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(Number).filter(id => Number.isFinite(id)));
      }
    } catch {
      // ignore invalid stored data
    }
    return new Set();
  }

  private persistFavorites(favorites: FavoriteSet): void {
    try {
      const serialized = JSON.stringify(Array.from(favorites));
      localStorage.setItem(this.storageKey, serialized);
    } catch {
      // ignore storage errors
    }
  }
}
