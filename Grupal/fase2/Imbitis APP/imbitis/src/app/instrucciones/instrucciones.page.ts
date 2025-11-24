import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, SearchbarCustomEvent, SegmentCustomEvent, createGesture, Gesture } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InstructionCategory, InstructionStep, InstructionsService } from './instructions.service';
import { UserPreferencesService } from '../core/user-preferences.service';
import { FeedbackService } from '../core/feedback.service';
import { EmergencyCallService } from '../core/emergency-call.service';
import { InstructionFavoritesService } from './instruction-favorites.service';
import { VoiceActivationState, VoiceCommandService } from '../core/voice-command.service';
import { InstructionOfflineService } from './instruction-offline.service';

type FeedbackChoice = 'like' | 'dislike';
type CategoryFilter = 'all' | 'favorites' | 'offline';

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
  favoriteCategoryIds = new Set<number>();
  offlineCategoryIds = new Set<number>();
  offlineBannerMessage = '';
  offlineActionMessage = '';
  categoryFilter: CategoryFilter = 'all';
  readonly categoryFilterOptions: Array<{ value: CategoryFilter; label: string; icon: string }> = [
    { value: 'all', label: 'Todo', icon: 'sparkles-outline' },
    { value: 'favorites', label: 'Favoritos', icon: 'star-outline' },
    { value: 'offline', label: 'Descargados', icon: 'cloud-offline-outline' },
  ];

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
  audioPlaybackRate = 1;
  readonly playbackRates: Array<{ value: number; label: string }> = [
    { value: 0.75, label: '0.75x' },
    { value: 1, label: '1.0x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2.0x' },
  ];

  feedbackModalOpen = false;
  feedbackChoice: FeedbackChoice | null = null;
  feedbackComment = '';
  feedbackSending = false;
  feedbackSuccess = false;
  feedbackError = '';
  completedCategoryName = '';
  completedCategoryId: number | null = null;
  voiceStatus: VoiceActivationState = 'unavailable';
  voiceStatusMessage = '';
  searchQuery = '';

  get totalCategories(): number {
    return this.categories.length;
  }

  get favoritesCount(): number {
    return this.favoriteCategoryIds.size;
  }

  get offlineCount(): number {
    return this.offlineCategoryIds.size;
  }

  get heroDescription(): string {
    if (this.isLoading) {
      return 'Reuniendo instrucciones esenciales...';
    }
    if (this.filteredCategories.length) {
      return 'Explora protocolos guiados y marca tus favoritos para accederlos rápido.';
    }
    return 'Aún no hay instrucciones disponibles, intenta sincronizar nuevamente.';
  }

  private audio: HTMLAudioElement | null = null;
  private autoReplayTimeout: ReturnType<typeof setTimeout> | null = null;
  private preferencesSubscription?: Subscription;
  private favoritesSubscription?: Subscription;
  private offlineSubscription?: Subscription;
  private offlineActionTimeout: ReturnType<typeof setTimeout> | null = null;
  private stepSwipeGesture?: Gesture;
  private stepContentElement?: HTMLElement | null;
  private categoryOrder = new Map<number, number>();
  private categoryRiskScore = new Map<number, number>();
  private readonly highRiskDangerLevel = 4;
  private readonly mediumRiskDangerLevel = 2;
  private readonly handleVoiceAdvance = (): void => {
    const category = this.selectedCategory;
    if (!category) {
      return;
    }
    if (this.currentStepIndex < category.steps.length - 1) {
      this.nextStep();
      return;
    }
    this.openFeedback();
  };

  @ViewChild('stepContent', { read: ElementRef })
  set stepContentRef(el: ElementRef<HTMLElement> | undefined) {
    this.stepContentElement = el?.nativeElement ?? null;
    if (this.stepContentElement) {
      this.initializeStepSwipeGesture();
    } else {
      this.destroyStepSwipeGesture();
    }
  }

  constructor(
    private readonly instructionsService: InstructionsService,
    private readonly preferences: UserPreferencesService,
    private readonly feedbackService: FeedbackService,
    private readonly router: Router,
    private readonly emergencyCallService: EmergencyCallService,
    private readonly favoritesService: InstructionFavoritesService,
    private readonly voiceCommands: VoiceCommandService,
    private readonly offlineInstructions: InstructionOfflineService,
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
    this.favoritesSubscription = this.favoritesService.favorites$.subscribe(favorites => {
      this.favoriteCategoryIds = new Set(favorites);
      this.applyFilters();
      this.visibleSubcategories = this.sortCategories(this.visibleSubcategories);
    });
    this.offlineSubscription = this.offlineInstructions.records$.subscribe(records => {
      this.offlineCategoryIds = new Set(records.map(record => record.id));
    });
    void this.loadCategories();
  }

  ngOnDestroy(): void {
    this.preferencesSubscription?.unsubscribe();
    this.favoritesSubscription?.unsubscribe();
    this.offlineSubscription?.unsubscribe();
    if (this.offlineActionTimeout) {
      clearTimeout(this.offlineActionTimeout);
      this.offlineActionTimeout = null;
    }
    this.stopAudioPlayback();
    this.destroyStepSwipeGesture();
    void this.disableVoiceCommands();
  }

  get currentStep(): InstructionStep | null {
    return this.selectedCategory?.steps[this.currentStepIndex] ?? null;
  }

  get currentSubcategoryParent(): InstructionCategory | null {
    return this.subCategoryPath.length
      ? this.subCategoryPath[this.subCategoryPath.length - 1]
      : null;
  }

  get stepProgressPercentage(): number {
    const total = this.selectedCategory?.steps.length ?? 0;
    if (!total) {
      return 0;
    }
    const progress = ((this.currentStepIndex + 1) / total) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  async loadCategories(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';
    this.offlineBannerMessage = '';
    try {
      const categories = await this.instructionsService.fetchInstructions();
      this.categories = categories.filter(category => this.hasCategoryContent(category));
      this.rebuildCategoryMetadata();
      this.applyFilters();
      this.closeSubcategoryModal();
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : 'No fue posible cargar las instrucciones.';
      const offlineCategories = this.offlineInstructions.getOfflineCategories();
      if (offlineCategories.length) {
        this.categories = offlineCategories.filter(category => this.hasCategoryContent(category));
        this.rebuildCategoryMetadata();
        this.applyFilters();
        this.closeSubcategoryModal();
        this.offlineBannerMessage = `${message} Mostrando instrucciones guardadas sin conexion.`;
      } else {
        this.loadError = message;
      }
    } finally {
      this.isLoading = false;
    }
  }

  trackCategory(_: number, item: InstructionCategory): number {
    return item.id;
  }

  trackTag(_: number, tag: string): string {
    return tag;
  }

  getStepsLabel(category: InstructionCategory): string {
    const total = category.steps?.length ?? 0;
    if (total <= 0) {
      return 'Sin pasos';
    }
    return total === 1 ? '1 paso' : `${total} pasos`;
  }

  getSubcategoryLabel(category: InstructionCategory): string {
    const total = category.children?.length ?? 0;
    if (total <= 0) {
      return 'Sin subcategorias';
    }
    return total === 1 ? '1 subcategoria' : `${total} subcategorias`;
  }


  isOfflineAvailable(category: InstructionCategory | null): boolean {
    if (!category) {
      return false;
    }
    return this.offlineCategoryIds.has(category.id);
  }

  toggleOfflineCategory(category: InstructionCategory | null, event?: Event): void {
    if (!category) {
      return;
    }
    event?.stopPropagation();
    try {
      if (this.offlineInstructions.hasCategory(category.id)) {
        this.offlineInstructions.removeCategory(category.id);
        this.setOfflineActionMessage(`Se elimin\u00f3 la descarga de "${category.name}".`);
      } else {
        this.offlineInstructions.saveCategory(category);
        this.setOfflineActionMessage(`"${category.name}" disponible sin conexi\u00f3n.`);
      }
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' ? error.message : 'No se pudo actualizar la descarga.';
      this.setOfflineActionMessage(message);
    }
  }

  private setOfflineActionMessage(message: string): void {
    this.offlineActionMessage = message;
    if (this.offlineActionTimeout) {
      clearTimeout(this.offlineActionTimeout);
    }
    this.offlineActionTimeout = setTimeout(() => {
      this.offlineActionMessage = '';
      this.offlineActionTimeout = null;
    }, 4000);
  }

  onSearchChange(ev: SearchbarCustomEvent): void {
    const query = (ev.detail?.value || '').toString().toLowerCase().trim();
    this.searchQuery = query;
    this.applyFilters();
  }

  onCategoryFilterChange(event: SegmentCustomEvent): void {
    const value = (event.detail.value as CategoryFilter) ?? 'all';
    if (this.categoryFilter === value) {
      return;
    }
    this.categoryFilter = value;
    this.applyFilters();
  }

  clearFilters(): void {
    if (!this.searchQuery && this.categoryFilter === 'all') {
      return;
    }
    this.searchQuery = '';
    this.categoryFilter = 'all';
    this.applyFilters();
  }

  isFilteringActive(): boolean {
    return Boolean(this.searchQuery || this.categoryFilter !== 'all');
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
    void this.enableVoiceCommands();

    setTimeout(() => {
      if (this.activeCardId === item.id) {
        this.activeCardId = null;
      }
    }, 400);
  }

  openSubcategoryModal(parent: InstructionCategory): void {
    this.stopAudioPlayback();
    this.subCategoryPath = [parent];
    this.visibleSubcategories = this.sortCategories(parent.children ?? []);
    this.subCategoryModalOpen = true;
  }

  handleSubcategoryClick(item: InstructionCategory): void {
    if (item.children?.length) {
      this.subCategoryPath = [...this.subCategoryPath, item];
      this.visibleSubcategories = this.sortCategories(item.children ?? []);
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
    this.visibleSubcategories = parent ? this.sortCategories(parent.children ?? []) : [];
  }

  closeSubcategoryModal(): void {
    this.subCategoryModalOpen = false;
    this.resetSubcategoryFlow();
  }

  private resetSubcategoryFlow(): void {
    this.subCategoryPath = [];
    this.visibleSubcategories = [];
  }

  toggleFavorite(category: InstructionCategory, event: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.favoritesService.toggleFavorite(category.id);
  }

  isFavorite(category: InstructionCategory): boolean {
    return this.favoriteCategoryIds.has(category.id);
  }

  closeSteps(): void {
    this.showSteps = false;
    this.selectedCategory = null;
    this.currentStepIndex = 0;
    this.stopAudioPlayback();
    this.stepContentElement = null;
    this.destroyStepSwipeGesture();
    void this.disableVoiceCommands();
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

  private async enableVoiceCommands(): Promise<void> {
    this.voiceStatusMessage = '';
    await this.voiceCommands.deactivate();
    const status = await this.voiceCommands.activate(this.handleVoiceAdvance);
    this.voiceStatus = status;
    if (status === 'no-permission') {
      this.voiceStatusMessage = 'Activa el permiso de microfono para decir \"LISTO\".';
    } else if (status === 'unavailable') {
      this.voiceStatusMessage = 'Los comandos por voz solo estan disponibles en la app instalada en Android.';
    } else if (status === 'error') {
      this.voiceStatusMessage = 'No se pudo iniciar el reconocimiento de voz.';
    }
  }

  private async disableVoiceCommands(): Promise<void> {
    await this.voiceCommands.deactivate();
    this.voiceStatus = 'unavailable';
    this.voiceStatusMessage = '';
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

  onPlaybackRateChange(event: SegmentCustomEvent): void {
    const value = Number(event.detail.value);
    if (!value || value === this.audioPlaybackRate) {
      return;
    }
    this.audioPlaybackRate = value;
    if (this.audio) {
      this.audio.playbackRate = value;
    }
  }

  private async playStepAudio(step: InstructionStep): Promise<void> {
    if (!step.audioUrl) {
      return;
    }

    this.stopAudioPlayback();
    this.isAudioLoading = true;

    const audio = new Audio(step.audioUrl);
    this.audio = audio;
    audio.playbackRate = this.audioPlaybackRate;

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

  private initializeStepSwipeGesture(): void {
    if (!this.stepContentElement || !this.selectedCategory || this.selectedCategory.steps.length < 2) {
      this.destroyStepSwipeGesture();
      return;
    }

    this.destroyStepSwipeGesture();
    this.stepSwipeGesture = createGesture({
      el: this.stepContentElement,
      gestureName: 'step-swipe',
      direction: 'x',
      threshold: 15,
      onEnd: ev => {
        const { deltaX, velocityX } = ev;
        if (Math.abs(deltaX) < 60 && Math.abs(velocityX) < 0.3) {
          return;
        }
        if (deltaX < 0) {
          this.nextStep();
        } else {
          this.previousStep();
        }
      },
    });
    this.stepSwipeGesture.enable(true);
  }

  private destroyStepSwipeGesture(): void {
    this.stepSwipeGesture?.destroy();
    this.stepSwipeGesture = undefined;
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
    if (category) {
      void this.incrementCategoryViews(category);
    }
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
        rating: this.feedbackChoice === null ? null : this.feedbackChoice === 'like' ? 5 : 1,
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
    const tagsMatch = category.tags.some(tag => tag.toLowerCase().includes(query));
    if (name.includes(query) || description.includes(query) || tagsMatch) {
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

  openSettings(): void {
    this.closeSteps();
    this.closeSubcategoryModal();
    this.closeFeedback();
    void this.router.navigate(['/settings']);
  }

  async callEmergency(): Promise<void> {
    await this.emergencyCallService.openEmergencyMenu();
  }

  private applyFilters(): void {
    const list = this.searchQuery
      ? this.categories.filter(item => this.matchesQuery(item, this.searchQuery))
      : [...this.categories];
    const filteredByChip = list.filter(item => this.matchesCategoryFilter(item));
    this.filteredCategories = this.sortCategories(filteredByChip);
  }

  private matchesCategoryFilter(category: InstructionCategory): boolean {
    switch (this.categoryFilter) {
      case 'favorites':
        return this.favoriteCategoryIds.has(category.id);
      case 'offline':
        return this.offlineCategoryIds.has(category.id);
      default:
        return true;
    }
  }

  private sortCategories(items: InstructionCategory[] = []): InstructionCategory[] {
    if (!items.length) {
      return [];
    }
    return [...items].sort((a, b) => {
      const aFav = this.favoriteCategoryIds.has(a.id) ? 1 : 0;
      const bFav = this.favoriteCategoryIds.has(b.id) ? 1 : 0;
      if (aFav !== bFav) {
        return bFav - aFav;
      }

      const riskDiff =
        (this.categoryRiskScore.get(b.id) ?? this.computeRiskScore(b)) -
        (this.categoryRiskScore.get(a.id) ?? this.computeRiskScore(a));
      if (riskDiff !== 0) {
        return riskDiff;
      }

      const aOrder = this.categoryOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = this.categoryOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
  }

  private rebuildCategoryMetadata(): void {
    this.categoryOrder.clear();
    this.categoryRiskScore.clear();
    let index = 0;

    const traverse = (items: InstructionCategory[]) => {
      for (const item of items) {
        if (!this.categoryOrder.has(item.id)) {
          this.categoryOrder.set(item.id, index++);
        }
        this.categoryRiskScore.set(item.id, this.computeRiskScore(item));
        if (item.children?.length) {
          traverse(item.children);
        }
      }
    };

    traverse(this.categories);
  }

  private computeRiskScore(category: InstructionCategory): number {
    if (typeof category.riskScore === 'number' && Number.isFinite(category.riskScore)) {
      return category.riskScore;
    }
    const views = Math.max(0, category.viewCount ?? 0);
    const danger = Math.max(1, category.dangerLevel ?? 1);
    return views * danger;
  }

  private refreshVisibleSubcategories(): void {
    if (!this.subCategoryModalOpen) {
      return;
    }
    const parent = this.currentSubcategoryParent;
    this.visibleSubcategories = parent ? this.sortCategories(parent.children ?? []) : [];
  }

  private async incrementCategoryViews(category: InstructionCategory): Promise<void> {
    try {
      const updated = await this.instructionsService.incrementCategoryViewCount(category.id, category.viewCount);
      category.viewCount = updated;
      category.riskScore = this.computeRiskScore(category);
      this.categoryRiskScore.set(category.id, category.riskScore);
      this.applyFilters();
      this.refreshVisibleSubcategories();
    } catch {
      // ignore update failures silently to avoid bloquear feedback
    }
  }

  getVoiceStatusCopy(): string {
    if (this.voiceStatusMessage) {
      return this.voiceStatusMessage;
    }
    switch (this.voiceStatus) {
      case 'listening':
        return 'Di "LISTO" para continuar';
      case 'no-permission':
        return 'Permite el micr�fono para usar la voz';
      case 'error':
        return 'No se pudo activar el micr�fono';
      default:
        return 'Activa los comandos de voz en ajustes';
    }
  }

  getVoiceStatusIcon(): string {
    switch (this.voiceStatus) {
      case 'listening':
        return 'mic-outline';
      case 'no-permission':
        return 'alert-circle-outline';
      case 'error':
        return 'mic-off-outline';
      default:
        return 'remove-circle-outline';
    }
  }
  getVoiceStatusClass(): string {
    switch (this.voiceStatus) {
      case 'listening':
        return 'tone-success';
      case 'no-permission':
        return 'tone-warning';
      case 'error':
        return 'tone-danger';
      default:
        return 'tone-muted';
    }
  }

}
