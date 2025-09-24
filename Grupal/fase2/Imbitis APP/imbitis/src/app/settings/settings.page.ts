import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { OverlayWidgetService } from '../core/overlay-widget.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  widgetEnabled = false;

  constructor(
    private overlayWidget: OverlayWidgetService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('widgetEnabled');
    this.widgetEnabled = saved === 'true';
  }

  async onWidgetToggle(ev: CustomEvent) {
    const value = (ev.detail as any)?.checked ?? false;
    if (value) {
      const ok = await this.overlayWidget.enableWidget();
      if (!ok) {
        this.widgetEnabled = false;
        localStorage.setItem('widgetEnabled', 'false');
        const a = await this.alertCtrl.create({
          header: 'Ajustes',
          message: 'No se pudo habilitar el widget. Verifica permisos de superposición en Android.',
          buttons: ['OK']
        });
        await a.present();
        return;
      }
      this.widgetEnabled = true;
      localStorage.setItem('widgetEnabled', 'true');
    } else {
      await this.overlayWidget.disableWidget();
      this.widgetEnabled = false;
      localStorage.setItem('widgetEnabled', 'false');
    }
  }
}
