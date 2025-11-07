import { Injectable } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';

interface EmergencyAction {
  readonly label: string;
  readonly number: string;
  readonly icon: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmergencyCallService {
  private readonly actions: EmergencyAction[] = [
    { label: 'Ambulancia (131)', number: '131', icon: 'medical-outline' },
    { label: 'Bomberos (132)', number: '132', icon: 'flame-outline' },
  ];

  constructor(private readonly actionSheetController: ActionSheetController) {}

  async openEmergencyMenu(): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      buttons: [
        ...this.actions.map(action => ({
          text: action.label,
          icon: action.icon,
          handler: () => this.callNumber(action.number),
        })),
        {
          text: 'Cancelar',
          role: 'cancel',
        },
      ],
      cssClass: 'emergency-action-sheet',
    });

    await actionSheet.present();
  }

  private callNumber(number: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.open(`tel:${number}`, '_system');
  }
}
