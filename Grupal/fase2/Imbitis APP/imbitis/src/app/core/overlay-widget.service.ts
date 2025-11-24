import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

type PermissionResult = { granted: boolean };

type WidgetState = {
  enabled: boolean;
  granted: boolean;
};

interface OverlayWidgetPlugin {
  enable(options?: Record<string, unknown>): Promise<void>;
  disable(options?: Record<string, unknown>): Promise<void>;
  getState(options?: Record<string, unknown>): Promise<WidgetState>;
  hasPermission(options?: Record<string, unknown>): Promise<PermissionResult>;
  requestPermission(options?: Record<string, unknown>): Promise<PermissionResult>;
  setAppState(options: { active: boolean }): Promise<void>;
}

const OverlayWidget = registerPlugin<OverlayWidgetPlugin>('OverlayWidget');

@Injectable({ providedIn: 'root' })
export class OverlayWidgetService {
  private readonly storageKey = 'widgetEnabled';

  private isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  async getStoredState(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      /* ignore */
    }

    if (!this.isAndroidNative()) {
      return false;
    }

    const state = await this.safeGetState();
    const enabled = !!state?.enabled && !!state?.granted;
    await this.persistState(enabled);
    return enabled;
  }

  async enableWidget(): Promise<boolean> {
    if (!this.isAndroidNative()) {
      await this.persistState(true);
      return true;
    }

    const hasPermission = await this.safeHasPermission();
    if (!hasPermission?.granted) {
      const requested = await this.safeRequestPermission();
      if (!requested?.granted) {
        await this.persistState(false);
        return false;
      }
    }

    try {
      await OverlayWidget.enable();
    } catch {
      await this.persistState(false);
      return false;
    }

    const state = await this.safeGetState();
    const enabled = !!state?.enabled && !!state?.granted;
    await this.persistState(enabled);

    if (!enabled) {
      try { await OverlayWidget.disable(); } catch { /* ignore */ }
    }

    return enabled;
  }

  async disableWidget(): Promise<boolean> {
    if (!this.isAndroidNative()) {
      await this.persistState(false);
      return true;
    }

    try {
      await OverlayWidget.disable();
    } catch {
      // ignore, we'll verify state below
    }

    const state = await this.safeGetState();
    const disabled = !state?.enabled;
    await this.persistState(false);
    return disabled;
  }

  private async persistState(enabled: boolean): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, enabled ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }

  private async safeGetState(): Promise<WidgetState | null> {
    if (!this.isAndroidNative()) {
      return null;
    }

    try {
      return await OverlayWidget.getState();
    } catch {
      return null;
    }
  }

  private async safeHasPermission(): Promise<PermissionResult | null> {
    try {
      return await OverlayWidget.hasPermission();
    } catch {
      return { granted: false };
    }
  }

  private async safeRequestPermission(): Promise<PermissionResult | null> {
    try {
      return await OverlayWidget.requestPermission();
    } catch {
      return { granted: false };
    }
  }

  async notifyAppState(active: boolean): Promise<void> {
    if (!this.isAndroidNative()) {
      return;
    }
    try {
      await OverlayWidget.setAppState({ active });
    } catch {
      /* ignore */
    }
  }
}
