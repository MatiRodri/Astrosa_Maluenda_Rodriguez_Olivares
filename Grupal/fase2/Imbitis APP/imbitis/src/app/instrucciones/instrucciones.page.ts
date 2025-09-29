import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, SearchbarCustomEvent } from '@ionic/angular';
import { InstructionCategory, InstructionStep, InstructionsService } from './instructions.service';

@Component({
  selector: 'app-instrucciones',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './instrucciones.page.html',
  styleUrls: ['./instrucciones.page.scss'],
})
export class InstruccionesPage implements OnInit, OnDestroy {
  categories: InstructionCategory[] = [];
  filteredCategories: InstructionCategory[] = [];

  selectedCategory: InstructionCategory | null = null;
  currentStepIndex = 0;
  activeCardId: number | null = null;
  showSteps = false;

  isLoading = false;
  loadError = '';

  private audio: HTMLAudioElement | null = null;
  isAudioLoading = false;
  isAudioPlaying = false;

  constructor(
    private readonly alertCtrl: AlertController,
    private readonly instructionsService: InstructionsService,
  ) {}

  ngOnInit(): void {
    void this.loadCategories();
  }

  ngOnDestroy(): void {
    this.stopAudioPlayback();
  }

  get currentStep(): InstructionStep | null {
    return this.selectedCategory?.steps[this.currentStepIndex] ?? null;
  }

  async loadCategories(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';
    try {
      const categories = await this.instructionsService.fetchInstructions();
      this.categories = categories.filter(category => category.steps.length > 0);
      this.filteredCategories = [...this.categories];
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : 'No fue posible cargar las instrucciones.';
      this.loadError = message;
    } finally {
      this.isLoading = false;
    }
  }

  trackCategory(_: number, item: InstructionCategory): number {
    return item.id;
  }

  onSearchChange(ev: SearchbarCustomEvent): void {
    const query = (ev.detail?.value || '').toString().toLowerCase().trim();
    if (!query) {
      this.filteredCategories = [...this.categories];
      return;
    }

    this.filteredCategories = this.categories.filter(item =>
      item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
    );
  }

  openSteps(item: InstructionCategory): void {
    this.selectedCategory = item;
    this.currentStepIndex = 0;
    this.showSteps = true;
    this.activeCardId = item.id;
    this.stopAudioPlayback();

    setTimeout(() => {
      if (this.activeCardId === item.id) {
        this.activeCardId = null;
      }
    }, 400);
  }

  closeSteps(): void {
    this.showSteps = false;
    this.selectedCategory = null;
    this.currentStepIndex = 0;
    this.stopAudioPlayback();
  }

  nextStep(): void {
    if (!this.selectedCategory) { return; }
    if (this.currentStepIndex < this.selectedCategory.steps.length - 1) {
      this.currentStepIndex++;
      this.stopAudioPlayback();
    }
  }

  previousStep(): void {
    if (!this.selectedCategory) { return; }
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.stopAudioPlayback();
    }
  }

  async toggleAudioPlayback(): Promise<void> {
    const step = this.currentStep;
    if (!step || !step.audioUrl) {
      return;
    }

    if (this.isAudioPlaying) {
      this.stopAudioPlayback();
      return;
    }

    this.stopAudioPlayback();
    this.isAudioLoading = true;

    const audio = new Audio(step.audioUrl);
    this.audio = audio;

    audio.onended = () => {
      this.isAudioPlaying = false;
      this.isAudioLoading = false;
      this.audio = null;
    };

    audio.onerror = () => {
      this.isAudioPlaying = false;
      this.isAudioLoading = false;
      this.audio = null;
    };

    try {
      await audio.play();
      this.isAudioPlaying = true;
    } catch (_error) {
      this.isAudioPlaying = false;
    } finally {
      this.isAudioLoading = false;
    }
  }

  stopAudioPlayback(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.isAudioPlaying = false;
    this.isAudioLoading = false;
  }

  async callEmergency(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Emergencia',
      message: 'Deseas llamar a los servicios de emergencia?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Llamar',
          cssClass: 'emergency-call',
          handler: () => {
            window.open('tel:131', '_system');
          },
        },
      ],
    });
    await alert.present();
  }
}
