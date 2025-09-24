import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
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
    private overlayWidget: OverlayWidgetService
  ) {}

  async ngOnInit() {
    try {
      const asked = localStorage.getItem('hasAskedWidget');
      if (!asked) {
        await this.presentWidgetPrompt();
      }
    } catch {
      // Si localStorage falla, no bloqueamos la app
    }
  }

  private async presentWidgetPrompt() {
    const alert = await this.alertController.create({
      header: 'Imbitis',
      message: '¿Quieres habilitar el widget de la aplicación?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            localStorage.setItem('hasAskedWidget', 'true');
          },
        },
        {
          text: 'Sí',
          handler: async () => {
            localStorage.setItem('widgetEnabled', 'true');
            localStorage.setItem('hasAskedWidget', 'true');
            // Intentar habilitar el widget si es Android nativo
            try { await this.overlayWidget.enableWidget(); } catch {}
          },
        },
      ],
    });
    await alert.present();
  }
}
