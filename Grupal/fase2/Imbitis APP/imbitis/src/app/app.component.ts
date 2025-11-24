import { Component, OnDestroy, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { AlertController, ToastController } from '@ionic/angular';
import { OverlayWidgetService } from './core/overlay-widget.service';
import { UserPreferencesService } from './core/user-preferences.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private appStateListener?: PluginListenerHandle;
  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private overlayWidget: OverlayWidgetService,
    private preferences: UserPreferencesService
  ) {}

  async ngOnInit() {
    // Asegura que las preferencias visuales se apliquen al iniciar la app.
    this.preferences.applyStoredColorProfile();
    this.preferences.applyStoredFontScale();
    await this.overlayWidget.notifyAppState(true);
    this.appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      void this.overlayWidget.notifyAppState(isActive);
    });
    try {
      const asked = localStorage.getItem('hasAskedWidget');
      if (!asked) {
        await this.presentWidgetPrompt();
      }
    } catch {
      // ignore storage errors
    }
  }

  private async presentWidgetPrompt() {
    const alert = await this.alertController.create({
      header: 'Imbitis',
      message: 'Quieres habilitar el widget de la aplicacion?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: async () => {
            localStorage.setItem('hasAskedWidget', 'true');
            localStorage.setItem('widgetEnabled', 'false');
            await this.overlayWidget.disableWidget();
          },
        },
        {
          text: 'Si',
          handler: async () => {
            localStorage.setItem('hasAskedWidget', 'true');
            const success = await this.overlayWidget.enableWidget();
            if (!success) {
              await this.presentPermissionToast();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async presentPermissionToast() {
    const toast = await this.toastController.create({
      message: 'No se pudo habilitar el widget. Revisa el permiso de superposicion.',
      duration: 3500,
      position: 'bottom',
    });
    await toast.present();
  }

  async ngOnDestroy(): Promise<void> {
    await this.appStateListener?.remove();
    this.appStateListener = undefined;
  }
}

