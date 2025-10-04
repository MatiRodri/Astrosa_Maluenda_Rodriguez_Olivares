import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly autoPlayKey = 'instructionsAutoPlayEnabled';
  private readonly autoPlaySubject = new BehaviorSubject<boolean>(this.loadAutoPlayPreference());

  readonly autoPlayEnabled$ = this.autoPlaySubject.asObservable();

  isAutoPlayEnabled(): boolean {
    return this.autoPlaySubject.value;
  }

  setAutoPlayEnabled(enabled: boolean): void {
    this.persistAutoPlay(enabled);
    this.autoPlaySubject.next(enabled);
  }

  private loadAutoPlayPreference(): boolean {
    try {
      const stored = localStorage.getItem(this.autoPlayKey);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      /* ignore */
    }
    return true;
  }

  private persistAutoPlay(enabled: boolean): void {
    try {
      localStorage.setItem(this.autoPlayKey, enabled ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }
}
