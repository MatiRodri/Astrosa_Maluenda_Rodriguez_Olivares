import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

type PermissionResult = { granted: boolean };

interface OverlayWidgetPlugin {
  enable(): Promise<void>;
  disable(): Promise<void>;
  hasPermission(): Promise<PermissionResult>;
  requestPermission(): Promise<PermissionResult>;
}

// Bridge for a future native plugin named "OverlayWidget" (Android only)
const OverlayWidget = registerPlugin<OverlayWidgetPlugin>('OverlayWidget');

@Injectable({ providedIn: 'root' })
export class OverlayWidgetService {
  private isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  async enableWidget(): Promise<boolean> {
    if (!this.isAndroidNative()) {
      console.warn('[OverlayWidget] Not running on Android native. Skipping.');
      return false;
    }
    try {
      const perm = await this.safeHasPermission();
      if (!perm?.granted) {
        const req = await this.safeRequestPermission();
        if (!req?.granted) return false;
      }
      await OverlayWidget.enable();
      return true;
    } catch (err) {
      console.warn('[OverlayWidget] enable failed:', err);
      return false;
    }
  }

  async disableWidget(): Promise<boolean> {
    if (!this.isAndroidNative()) return false;
    try {
      await OverlayWidget.disable();
      return true;
    } catch (err) {
      console.warn('[OverlayWidget] disable failed:', err);
      return false;
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
}
