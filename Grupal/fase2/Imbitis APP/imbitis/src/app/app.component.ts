import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { OverlayWidgetService } from './core/overlay-widget.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private overlayWidget: OverlayWidgetService
  ) {}

  async ngOnInit() {
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
}
