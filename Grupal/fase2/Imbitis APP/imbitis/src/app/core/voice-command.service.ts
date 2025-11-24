import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  SpeechRecognition as CordovaSpeechRecognition,
  SpeechRecognitionListeningOptionsAndroid,
} from '@awesome-cordova-plugins/speech-recognition/ngx';
import { Subscription } from 'rxjs';

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognitionResultList = {
  length: number;
  [index: number]: BrowserSpeechRecognitionResult;
};

type BrowserSpeechRecognitionResult = {
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
};

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type BrowserSpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };

export type VoiceActivationState =
  | 'listening'
  | 'no-permission'
  | 'unavailable'
  | 'error';

@Injectable({ providedIn: 'root' })
export class VoiceCommandService {
  private static readonly KEYWORDS = ['listo', 'listos', 'siguiente', 'continuar', 'hecho', 'avanza', 'ok'];

  private recognitionSub?: Subscription;
  private lastTrigger = 0;
  private listening = false;
  private webRecognition: BrowserSpeechRecognition | null = null;
  private webRestartTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly speech: CordovaSpeechRecognition,
  ) {}

  async activate(onListo: () => void): Promise<VoiceActivationState> {
    if (this.isNativePlatform()) {
      return await this.activateNative(onListo);
    }

    if (this.supportsBrowserSpeech()) {
      return this.activateBrowser(onListo);
    }

    return 'unavailable';
  }

  private async activateNative(onListo: () => void): Promise<VoiceActivationState> {
    const available = await this.hasHardwareSupport();
    if (!available) {
      return 'unavailable';
    }

    const allowed = await this.ensurePermission();
    if (!allowed) {
      return 'no-permission';
    }

    if (this.listening && !this.webRecognition) {
      return 'listening';
    }

    return this.startNativeListening(onListo);
  }

  private activateBrowser(onListo: () => void): VoiceActivationState {
    if (this.listening) {
      return 'listening';
    }

    const ctor = this.getBrowserRecognitionCtor();
    if (!ctor) {
      return 'unavailable';
    }

    try {
      const recognition = new ctor();
      recognition.lang = this.resolveLocale();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;
      recognition.onerror = () => this.restartBrowserRecognition(onListo);
      recognition.onend = () => {
        if (this.listening) {
          this.restartBrowserRecognition(onListo);
        }
      };
      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        const matches: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          for (let j = 0; j < result.length; j++) {
            matches.push(result[j].transcript);
          }
        }
        this.handleMatches(matches, onListo);
      };

      this.webRecognition = recognition;
      recognition.start();
      this.listening = true;
      return 'listening';
    } catch {
      this.destroyBrowserRecognition();
      this.listening = false;
      return 'error';
    }
  }

  private async startNativeListening(onListo: () => void): Promise<VoiceActivationState> {
    try {
      this.startListening(onListo);
      this.listening = true;
      return 'listening';
    } catch {
      await this.detachListeners();
      this.listening = false;
      return 'error';
    }
  }

  async deactivate(): Promise<void> {
    if (this.isNativePlatform()) {
      await this.detachListeners();
      if (this.isIOSPlatform()) {
        try {
          await this.speech.stopListening();
        } catch {
          // ignore plugin stop errors to avoid blocking UI
        }
      }
    } else {
      this.destroyBrowserRecognition();
    }
    if (this.webRestartTimeout) {
      clearTimeout(this.webRestartTimeout);
      this.webRestartTimeout = null;
    }
    this.listening = false;
  }

  get isListening(): boolean {
    return this.listening;
  }

  private async hasHardwareSupport(): Promise<boolean> {
    try {
      return await this.speech.isRecognitionAvailable();
    } catch {
      return false;
    }
  }

  private async ensurePermission(): Promise<boolean> {
    try {
      const permission = await this.speech.hasPermission();
      if (permission) {
        return true;
      }
      await this.speech.requestPermission();
      return await this.speech.hasPermission();
    } catch {
      return false;
    }
  }

  private startListening(onListo: () => void): void {
    this.detachListeners();
    const options: SpeechRecognitionListeningOptionsAndroid = {
      language: this.resolveLocale(),
      matches: 3,
      prompt: 'Di LISTO para continuar',
      showPopup: false,
      showPartial: true,
    };
    const stream = this.speech.startListening(options);
    this.recognitionSub = stream.subscribe({
      next: matches => this.handleMatches(matches ?? [], onListo),
      error: () => {
        void this.restartNativeListening(onListo);
      },
    });
  }

  private async detachListeners(): Promise<void> {
    this.recognitionSub?.unsubscribe();
    this.recognitionSub = undefined;
  }

  private handleMatches(matches: string[], onListo: () => void): void {
    if (!matches?.length || !this.containsKeyword(matches)) {
      return;
    }
    const now = Date.now();
    if (now - this.lastTrigger < 1200) {
      return;
    }
    this.lastTrigger = now;
    this.zone.run(onListo);
    if (this.isNativePlatform()) {
      void this.restartNativeListening(onListo);
    }
  }

  private isNativePlatform(): boolean {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      const platform = Capacitor.getPlatform?.();
      return platform !== 'web';
    }
  }

  private supportsBrowserSpeech(): boolean {
    if (this.isNativePlatform()) {
      return false;
    }
    if (typeof window === 'undefined') {
      return false;
    }
    const win = window as BrowserSpeechWindow;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private getBrowserRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const win = window as BrowserSpeechWindow;
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }

  private restartBrowserRecognition(onListo: () => void): void {
    this.destroyBrowserRecognition();
    if (!this.listening) {
      return;
    }
    this.webRestartTimeout = setTimeout(() => {
      this.webRestartTimeout = null;
      this.activateBrowser(onListo);
    }, 600);
  }

  private destroyBrowserRecognition(): void {
    if (this.webRecognition) {
      try {
        this.webRecognition.onresult = null;
        this.webRecognition.onerror = null;
        this.webRecognition.onend = null;
        this.webRecognition.stop();
      } catch {
        // ignore stop errors
      }
      this.webRecognition = null;
    }
  }

  private containsKeyword(matches: string[]): boolean {
    for (const raw of matches) {
      const normalized = this.normalizeText(raw);
      if (!normalized) {
        continue;
      }
      if (VoiceCommandService.KEYWORDS.some(keyword => normalized.includes(keyword))) {
        return true;
      }
    }
    return false;
  }

  private normalizeText(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveLocale(): string {
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('es')) {
      return navigator.language;
    }
    return 'es-419';
  }

  private async restartNativeListening(onListo: () => void): Promise<void> {
    if (!this.listening || !this.isNativePlatform()) {
      return;
    }
    await this.detachListeners();
    await new Promise(resolve => setTimeout(resolve, 150));
    try {
      this.startListening(onListo);
    } catch {
      this.listening = false;
    }
  }

  private isIOSPlatform(): boolean {
    try {
      return Capacitor.getPlatform?.() === 'ios';
    } catch {
      return false;
    }
  }
}
