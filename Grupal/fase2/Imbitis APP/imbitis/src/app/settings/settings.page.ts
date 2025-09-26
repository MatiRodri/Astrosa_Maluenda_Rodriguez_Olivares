import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { OverlayWidgetService } from '../core/overlay-widget.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  widgetEnabled = false;

  constructor(
    private alertController: AlertController,
    private overlayWidget: OverlayWidgetService
  ) {}

  async ngOnInit() {
    this.widgetEnabled = await this.overlayWidget.getStoredState();
  }

  async onWidgetToggle(event: CustomEvent) {
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

  private async presentFailureAlert() {
    const alert = await this.alertController.create({
      header: 'Widget',
      message: 'No se pudo habilitar el widget. Revisa el permiso de superposicion en Android.',
      buttons: ['Entendido'],
    });
    await alert.present();
  }
}
