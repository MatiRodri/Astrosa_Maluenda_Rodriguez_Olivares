import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { OverlayWidgetService } from '../core/overlay-widget.service';
import {
  ColorProfile,
  UserPreferencesService,
} from '../core/user-preferences.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  widgetEnabled = false;
  autoPlayEnabled = true;
  selectedColorProfile: ColorProfile = 'normal';
  readonly colorProfiles: Array<{
    id: ColorProfile;
    label: string;
    description: string;
    preview: string[];
  }> = [
    {
      id: 'normal',
      label: 'Normal',
      description: 'Colores predeterminados de la aplicación.',
      preview: ['#3b82f6', '#10b981', '#f97316'],
    },
    {
      id: 'protanomaly',
      label: 'Protanomalía',
      description: 'Mejora el contraste entre rojos y verdes.',
      preview: ['#2b7bb6', '#ffb703', '#55a630'],
    },
    {
      id: 'deuteranomaly',
      label: 'Deuteranomalía',
      description: 'Paleta compensada para distinguir verdes.',
      preview: ['#1f78b4', '#33a02c', '#ffb000'],
    },
    {
      id: 'tritanomaly',
      label: 'Tritanomalía',
      description: 'Reduce conflictos entre azules y amarillos.',
      preview: ['#ff6f61', '#6b5b95', '#88b04b'],
    },
    {
      id: 'achromatopsia',
      label: 'Acromatopsia',
      description: 'Escala de grises de alto contraste.',
      preview: ['#4b5563', '#6b7280', '#9ca3af'],
    },
  ];

  constructor(
    private alertController: AlertController,
    private overlayWidget: OverlayWidgetService,
    private preferences: UserPreferencesService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.widgetEnabled = await this.overlayWidget.getStoredState();
    this.autoPlayEnabled = this.preferences.isAutoPlayEnabled();
    this.selectedColorProfile = this.preferences.getColorProfile();
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

  onColorProfileChange(event: CustomEvent): void {
    const profile = event?.detail?.value as ColorProfile | undefined;
    if (!profile || profile === this.selectedColorProfile) {
      return;
    }
    this.preferences.setColorProfile(profile);
    this.selectedColorProfile = profile;
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
