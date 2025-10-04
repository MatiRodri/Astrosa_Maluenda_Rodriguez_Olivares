import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { OverlayWidgetService } from '../core/overlay-widget.service';
import { UserPreferencesService } from '../core/user-preferences.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  widgetEnabled = false;
  autoPlayEnabled = true;

  constructor(
    private alertController: AlertController,
    private overlayWidget: OverlayWidgetService,
    private preferences: UserPreferencesService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.widgetEnabled = await this.overlayWidget.getStoredState();
    this.autoPlayEnabled = this.preferences.isAutoPlayEnabled();
  }

  async onWidgetToggle(event: CustomEvent): Promise<void> {
    const enabled = !!event?.detail?.checked;
    if (enabled) {
      const success = await this.overlayWidget.enableWidget();
      if (!success) {
        this.widgetEnabled = false;
        await this.presentFailureAlert();
        return;
      }
      this.widgetEnabled = true;
      return;
    }

    await this.overlayWidget.disableWidget();
    this.widgetEnabled = false;
  }

  onAutoPlayToggle(event: CustomEvent): void {
    const enabled = !!event?.detail?.checked;
    this.preferences.setAutoPlayEnabled(enabled);
    this.autoPlayEnabled = enabled;
  }

  private async presentFailureAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Widget',
      message: 'No se pudo habilitar el widget. Revisa el permiso de superposicion en Android.',
      buttons: ['Entendido'],
    });
    await alert.present();
  }
}
