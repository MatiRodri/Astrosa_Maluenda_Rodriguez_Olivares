import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, SearchbarCustomEvent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { InstructionCategory, InstructionStep, InstructionsService } from './instructions.service';
import { UserPreferencesService } from '../core/user-preferences.service';
import { FeedbackService } from '../core/feedback.service';

type FeedbackChoice = 'like' | 'dislike';

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

  subCategoryModalOpen = false;
  subCategoryPath: InstructionCategory[] = [];
  visibleSubcategories: InstructionCategory[] = [];

  selectedCategory: InstructionCategory | null = null;
  currentStepIndex = 0;
  activeCardId: number | null = null;
  showSteps = false;

  isLoading = false;
  loadError = '';

  autoPlayEnabled = true;
  isAudioLoading = false;
  isAudioPlaying = false;

  feedbackModalOpen = false;
  feedbackChoice: FeedbackChoice | null = null;
  feedbackComment = '';
  feedbackSending = false;
  feedbackSuccess = false;
  feedbackError = '';
  completedCategoryName = '';
  completedCategoryId: number | null = null;

  private audio: HTMLAudioElement | null = null;
  private autoReplayTimeout: ReturnType<typeof setTimeout> | null = null;
  private preferencesSubscription?: Subscription;

  constructor(
    private readonly alertCtrl: AlertController,
    private readonly instructionsService: InstructionsService,
    private readonly preferences: UserPreferencesService,
    private readonly feedbackService: FeedbackService,
  ) {}

  ngOnInit(): void {
    this.preferencesSubscription = this.preferences.autoPlayEnabled$.subscribe(enabled => {
      this.autoPlayEnabled = enabled;
      if (!enabled) {
        this.stopAudioPlayback();
      } else {
        this.scheduleAutoPlayback();
      }
    });
    void this.loadCategories();
  }

  ngOnDestroy(): void {
    this.preferencesSubscription?.unsubscribe();
    this.stopAudioPlayback();
  }

  get currentStep(): InstructionStep | null {
    return this.selectedCategory?.steps[this.currentStepIndex] ?? null;
  }

  get currentSubcategoryParent(): InstructionCategory | null {
    return this.subCategoryPath.length
      ? this.subCategoryPath[this.subCategoryPath.length - 1]
      : null;
  }

  async loadCategories(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';
    try {
      const categories = await this.instructionsService.fetchInstructions();
      this.categories = categories.filter(category => this.hasCategoryContent(category));
      this.filteredCategories = [...this.categories];
      this.closeSubcategoryModal();
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
      this.matchesQuery(item, query)
    );
  }

  handleCategoryClick(item: InstructionCategory): void {
    this.closeSteps();

    if (item.children?.length) {
      this.openSubcategoryModal(item);
      return;
    }

    if (!item.steps.length) {
      return;
    }

    this.openSteps(item);
  }

  openSteps(item: InstructionCategory): void {
    this.closeSubcategoryModal();
    this.selectedCategory = item;
    this.currentStepIndex = 0;
    this.showSteps = true;
    this.activeCardId = item.id;
    this.stopAudioPlayback();
    this.scheduleAutoPlayback();

    setTimeout(() => {
      if (this.activeCardId === item.id) {
        this.activeCardId = null;
      }
    }, 400);
  }

  openSubcategoryModal(parent: InstructionCategory): void {
    this.stopAudioPlayback();
    this.subCategoryPath = [parent];
    this.visibleSubcategories = [...parent.children];
    this.subCategoryModalOpen = true;
  }

  handleSubcategoryClick(item: InstructionCategory): void {
    if (item.children?.length) {
      this.subCategoryPath = [...this.subCategoryPath, item];
      this.visibleSubcategories = [...item.children];
      return;
    }

    if (!item.steps.length) {
      return;
    }

    this.closeSubcategoryModal();
    this.openSteps(item);
  }

  goBackSubcategoryLevel(): void {
    if (this.subCategoryPath.length <= 1) {
      this.closeSubcategoryModal();
      return;
    }

    this.subCategoryPath = this.subCategoryPath.slice(0, -1);
    const parent = this.currentSubcategoryParent;
    this.visibleSubcategories = parent ? [...parent.children] : [];
  }

  closeSubcategoryModal(): void {
    this.subCategoryModalOpen = false;
    this.resetSubcategoryFlow();
  }

  private resetSubcategoryFlow(): void {
    this.subCategoryPath = [];
    this.visibleSubcategories = [];
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
      this.scheduleAutoPlayback();
    }
  }

  previousStep(): void {
    if (!this.selectedCategory) { return; }
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.stopAudioPlayback();
      this.scheduleAutoPlayback();
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

    await this.playStepAudio(step);
  }

  private async playStepAudio(step: InstructionStep): Promise<void> {
    if (!step.audioUrl) {
      return;
    }

    this.stopAudioPlayback();
    this.isAudioLoading = true;

    const audio = new Audio(step.audioUrl);
    this.audio = audio;

    const scheduleReplay = () => {
      if (this.autoPlayEnabled && this.isCurrentStep(step)) {
        this.scheduleAutoPlayback(5000);
      }
    };

    audio.onended = () => {
      this.isAudioPlaying = false;
      this.audio = null;
      scheduleReplay();
    };

    audio.onerror = () => {
      this.isAudioPlaying = false;
      this.audio = null;
      scheduleReplay();
    };

    try {
      await audio.play();
      this.isAudioPlaying = true;
    } catch (_error) {
      this.isAudioPlaying = false;
      scheduleReplay();
    } finally {
      this.isAudioLoading = false;
    }
  }

  private scheduleAutoPlayback(delayMs = 0): void {
    this.clearAutoReplayTimer();
    if (!this.autoPlayEnabled || !this.showSteps) {
      return;
    }

    const step = this.currentStep;
    if (!step || !step.audioUrl) {
      return;
    }

    if (this.isAudioPlaying && this.audio) {
      return;
    }

    if (delayMs === 0) {
      this.isAudioLoading = true;
    }

    this.autoReplayTimeout = setTimeout(() => {
      void this.playStepAudio(step);
    }, delayMs);
  }

  private clearAutoReplayTimer(): void {
    if (this.autoReplayTimeout) {
      clearTimeout(this.autoReplayTimeout);
      this.autoReplayTimeout = null;
    }
  }

  private isCurrentStep(step: InstructionStep): boolean {
    return this.currentStep?.id === step.id;
  }

  stopAudioPlayback(): void {
    this.clearAutoReplayTimer();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.isAudioPlaying = false;
    this.isAudioLoading = false;
  }

  openFeedback(): void {
    const category = this.selectedCategory;
    this.closeSteps();
    this.completedCategoryId = category?.id ?? null;
    this.completedCategoryName = category?.name ?? '';
    this.resetFeedback();
    this.feedbackModalOpen = true;
  }

  closeFeedback(): void {
    this.feedbackModalOpen = false;
    this.resetFeedback();
    this.completedCategoryId = null;
    this.completedCategoryName = '';
  }

  selectFeedback(choice: FeedbackChoice): void {
    this.feedbackChoice = this.feedbackChoice === choice ? null : choice;
  }

  async submitFeedback(): Promise<void> {
    if (this.feedbackSending) {
      return;
    }

    const categoryId = this.completedCategoryId;
    if (!categoryId) {
      this.feedbackError = 'No se pudo identificar la categoria.';
      return;
    }

    this.feedbackSending = true;
    this.feedbackError = '';

    try {
      await this.feedbackService.submitFeedback({
        categoryId,
        rating: this.feedbackChoice === null ? null : this.feedbackChoice === 'like' ? 1 : 0,
        comment: this.feedbackComment,
      });
      this.feedbackSuccess = true;
      this.feedbackSending = false;
      setTimeout(() => {
        this.closeFeedback();
      }, 1000);
    } catch (error: any) {
      this.feedbackSending = false;
      this.feedbackError = typeof error?.message === 'string' ? error.message : 'No se pudo enviar el feedback.';
    }
  }

  private matchesQuery(category: InstructionCategory, query: string): boolean {
    const name = category.name.toLowerCase();
    const description = category.description.toLowerCase();
    if (name.includes(query) || description.includes(query)) {
      return true;
    }

    return category.children.some(child => this.matchesQuery(child, query));
  }

  private hasCategoryContent(category: InstructionCategory): boolean {
    if (category.steps.length > 0) {
      return true;
    }

    return category.children.some(child => this.hasCategoryContent(child));
  }

  private resetFeedback(): void {
    this.feedbackChoice = null;
    this.feedbackComment = '';
    this.feedbackSending = false;
    this.feedbackSuccess = false;
    this.feedbackError = '';
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
