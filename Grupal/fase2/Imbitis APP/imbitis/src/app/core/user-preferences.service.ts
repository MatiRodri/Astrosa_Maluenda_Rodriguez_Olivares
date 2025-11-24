import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ColorProfile =
  | 'normal'
  | 'protanomaly'
  | 'deuteranomaly'
  | 'tritanomaly'
  | 'achromatopsia';

export type FontScale = 'normal' | 'large' | 'xlarge';

type ThemeVariables = Record<string, string>;

const COLOR_PROFILES: Record<ColorProfile, ThemeVariables> = {
  normal: {
    '--ion-color-primary': '#3b82f6',
    '--ion-color-primary-rgb': '59,130,246',
    '--ion-color-primary-contrast': '#ffffff',
    '--ion-color-primary-contrast-rgb': '255,255,255',
    '--ion-color-primary-shade': '#3575dd',
    '--ion-color-primary-tint': '#4c8ff7',
    '--ion-color-secondary': '#10b981',
    '--ion-color-secondary-rgb': '16,185,129',
    '--ion-color-secondary-contrast': '#ffffff',
    '--ion-color-secondary-contrast-rgb': '255,255,255',
    '--ion-color-secondary-shade': '#0ea373',
    '--ion-color-secondary-tint': '#28c292',
    '--ion-color-tertiary': '#f97316',
    '--ion-color-tertiary-rgb': '249,115,22',
    '--ion-color-tertiary-contrast': '#ffffff',
    '--ion-color-tertiary-contrast-rgb': '255,255,255',
    '--ion-color-tertiary-shade': '#db6613',
    '--ion-color-tertiary-tint': '#fa8133',
    '--ion-color-success': '#22c55e',
    '--ion-color-success-rgb': '34,197,94',
    '--ion-color-success-contrast': '#ffffff',
    '--ion-color-success-contrast-rgb': '255,255,255',
    '--ion-color-success-shade': '#1ea953',
    '--ion-color-success-tint': '#38cb70',
    '--ion-color-warning': '#efb222',
    '--ion-color-warning-rgb': '239,178,34',
    '--ion-color-warning-contrast': '#1e293b',
    '--ion-color-warning-contrast-rgb': '30,41,59',
    '--ion-color-warning-shade': '#d29c1e',
    '--ion-color-warning-tint': '#f2ba38',
    '--ion-color-danger': '#ef4444',
    '--ion-color-danger-rgb': '239,68,68',
    '--ion-color-danger-contrast': '#ffffff',
    '--ion-color-danger-contrast-rgb': '255,255,255',
    '--ion-color-danger-shade': '#d43c3c',
    '--ion-color-danger-tint': '#f15757',
    '--ion-color-medium': '#64748b',
    '--ion-color-medium-rgb': '100,116,139',
    '--ion-color-medium-contrast': '#ffffff',
    '--ion-color-medium-contrast-rgb': '255,255,255',
    '--ion-color-medium-shade': '#58677a',
    '--ion-color-medium-tint': '#748296',
    '--ion-color-light': '#f8fafc',
    '--ion-color-light-rgb': '248,250,252',
    '--ion-color-light-contrast': '#1e293b',
    '--ion-color-light-contrast-rgb': '30,41,59',
    '--ion-color-light-shade': '#dadcdd',
    '--ion-color-light-tint': '#f9fbfd',
    '--ion-background-color': '#f8fafc',
    '--ion-background-color-rgb': '248,250,252',
    '--ion-text-color': '#0f172a',
    '--ion-text-color-rgb': '15,23,42',
    '--ion-toolbar-background': '#3b82f6',
    '--ion-toolbar-color': '#ffffff',
    '--searchbar-background': '#ffffff',
    '--searchbar-border-color': 'rgba(15,23,42,0.08)',
    '--searchbar-text-color': '#0f172a',
    '--searchbar-placeholder-color': 'rgba(15,23,42,0.55)',
    '--searchbar-icon-color': 'rgba(15,23,42,0.55)',
    '--searchbar-background-dark': 'rgba(255,255,255,0.08)',
    '--searchbar-border-color-dark': 'rgba(255,255,255,0.24)',
    '--searchbar-text-color-dark': '#f9fafb',
    '--searchbar-placeholder-color-dark': 'rgba(249,250,251,0.7)',
    '--searchbar-icon-color-dark': 'rgba(249,250,251,0.65)',
  },
  protanomaly: {
    '--ion-color-primary': '#2b7bb6',
    '--ion-color-primary-rgb': '43,123,182',
    '--ion-color-primary-contrast': '#ffffff',
    '--ion-color-primary-contrast-rgb': '255,255,255',
    '--ion-color-primary-shade': '#256ca0',
    '--ion-color-primary-tint': '#4088be',
    '--ion-color-secondary': '#ffb703',
    '--ion-color-secondary-rgb': '255,183,3',
    '--ion-color-secondary-contrast': '#1e293b',
    '--ion-color-secondary-contrast-rgb': '30,41,59',
    '--ion-color-secondary-shade': '#e0a002',
    '--ion-color-secondary-tint': '#ffc221',
    '--ion-color-tertiary': '#2196a5',
    '--ion-color-tertiary-rgb': '33,150,165',
    '--ion-color-tertiary-contrast': '#ffffff',
    '--ion-color-tertiary-contrast-rgb': '255,255,255',
    '--ion-color-tertiary-shade': '#1d8692',
    '--ion-color-tertiary-tint': '#37a2b0',
    '--ion-color-success': '#55a630',
    '--ion-color-success-rgb': '85,166,48',
    '--ion-color-success-contrast': '#ffffff',
    '--ion-color-success-contrast-rgb': '255,255,255',
    '--ion-color-success-shade': '#4a902a',
    '--ion-color-success-tint': '#66af45',
    '--ion-color-warning': '#f48c06',
    '--ion-color-warning-rgb': '244,140,6',
    '--ion-color-warning-contrast': '#1e293b',
    '--ion-color-warning-contrast-rgb': '30,41,59',
    '--ion-color-warning-shade': '#d87b05',
    '--ion-color-warning-tint': '#f5991f',
    '--ion-color-danger': '#bb3e03',
    '--ion-color-danger-rgb': '187,62,3',
    '--ion-color-danger-contrast': '#ffffff',
    '--ion-color-danger-contrast-rgb': '255,255,255',
    '--ion-color-danger-shade': '#a23603',
    '--ion-color-danger-tint': '#c2551c',
    '--ion-color-medium': '#5e6472',
    '--ion-color-medium-rgb': '94,100,114',
    '--ion-color-medium-contrast': '#ffffff',
    '--ion-color-medium-contrast-rgb': '255,255,255',
    '--ion-color-medium-shade': '#535861',
    '--ion-color-medium-tint': '#6e7381',
    '--ion-color-light': '#f5f1e6',
    '--ion-color-light-rgb': '245,241,230',
    '--ion-color-light-contrast': '#1e293b',
    '--ion-color-light-contrast-rgb': '30,41,59',
    '--ion-color-light-shade': '#d7d4c9',
    '--ion-color-light-tint': '#f6f3ea',
    '--ion-background-color': '#f5f1e6',
    '--ion-background-color-rgb': '245,241,230',
    '--ion-text-color': '#1e293b',
    '--ion-text-color-rgb': '30,41,59',
    '--ion-toolbar-background': '#2b7bb6',
    '--ion-toolbar-color': '#ffffff',
    '--searchbar-background': '#ffffff',
    '--searchbar-border-color': 'rgba(30,41,59,0.08)',
    '--searchbar-text-color': '#1e293b',
    '--searchbar-placeholder-color': 'rgba(30,41,59,0.55)',
    '--searchbar-icon-color': 'rgba(30,41,59,0.55)',
    '--searchbar-background-dark': 'rgba(255,255,255,0.08)',
    '--searchbar-border-color-dark': 'rgba(255,255,255,0.24)',
    '--searchbar-text-color-dark': '#f9fafb',
    '--searchbar-placeholder-color-dark': 'rgba(249,250,251,0.7)',
    '--searchbar-icon-color-dark': 'rgba(249,250,251,0.65)',
  },
  deuteranomaly: {
    '--ion-color-primary': '#1f78b4',
    '--ion-color-primary-rgb': '31,120,180',
    '--ion-color-primary-contrast': '#ffffff',
    '--ion-color-primary-contrast-rgb': '255,255,255',
    '--ion-color-primary-shade': '#1b6aa0',
    '--ion-color-primary-tint': '#3586bc',
    '--ion-color-secondary': '#33a02c',
    '--ion-color-secondary-rgb': '51,160,44',
    '--ion-color-secondary-contrast': '#ffffff',
    '--ion-color-secondary-contrast-rgb': '255,255,255',
    '--ion-color-secondary-shade': '#2c8c26',
    '--ion-color-secondary-tint': '#47aa41',
    '--ion-color-tertiary': '#ffb000',
    '--ion-color-tertiary-rgb': '255,176,0',
    '--ion-color-tertiary-contrast': '#1e293b',
    '--ion-color-tertiary-contrast-rgb': '30,41,59',
    '--ion-color-tertiary-shade': '#e09a00',
    '--ion-color-tertiary-tint': '#ffbc1a',
    '--ion-color-success': '#6a4c93',
    '--ion-color-success-rgb': '106,76,147',
    '--ion-color-success-contrast': '#ffffff',
    '--ion-color-success-contrast-rgb': '255,255,255',
    '--ion-color-success-shade': '#5c4281',
    '--ion-color-success-tint': '#785da0',
    '--ion-color-warning': '#ff7c43',
    '--ion-color-warning-rgb': '255,124,67',
    '--ion-color-warning-contrast': '#1e293b',
    '--ion-color-warning-contrast-rgb': '30,41,59',
    '--ion-color-warning-shade': '#e06d3b',
    '--ion-color-warning-tint': '#ff8a58',
    '--ion-color-danger': '#d62839',
    '--ion-color-danger-rgb': '214,40,57',
    '--ion-color-danger-contrast': '#ffffff',
    '--ion-color-danger-contrast-rgb': '255,255,255',
    '--ion-color-danger-shade': '#bc2332',
    '--ion-color-danger-tint': '#da3e4d',
    '--ion-color-medium': '#4b5563',
    '--ion-color-medium-rgb': '75,85,99',
    '--ion-color-medium-contrast': '#ffffff',
    '--ion-color-medium-contrast-rgb': '255,255,255',
    '--ion-color-medium-shade': '#424b56',
    '--ion-color-medium-tint': '#5d6673',
    '--ion-color-light': '#f3f4f6',
    '--ion-color-light-rgb': '243,244,246',
    '--ion-color-light-contrast': '#1e293b',
    '--ion-color-light-contrast-rgb': '30,41,59',
    '--ion-color-light-shade': '#d6d7d8',
    '--ion-color-light-tint': '#f4f5f7',
    '--ion-background-color': '#f3f4f6',
    '--ion-background-color-rgb': '243,244,246',
    '--ion-text-color': '#0f172a',
    '--ion-text-color-rgb': '15,23,42',
    '--ion-toolbar-background': '#1f78b4',
    '--ion-toolbar-color': '#ffffff',
    '--searchbar-background': '#ffffff',
    '--searchbar-border-color': 'rgba(15,23,42,0.08)',
    '--searchbar-text-color': '#0f172a',
    '--searchbar-placeholder-color': 'rgba(15,23,42,0.55)',
    '--searchbar-icon-color': 'rgba(15,23,42,0.55)',
    '--searchbar-background-dark': 'rgba(255,255,255,0.08)',
    '--searchbar-border-color-dark': 'rgba(255,255,255,0.24)',
    '--searchbar-text-color-dark': '#f9fafb',
    '--searchbar-placeholder-color-dark': 'rgba(249,250,251,0.7)',
    '--searchbar-icon-color-dark': 'rgba(249,250,251,0.65)',
  },
  tritanomaly: {
    '--ion-color-primary': '#ff6f61',
    '--ion-color-primary-rgb': '255,111,97',
    '--ion-color-primary-contrast': '#1e293b',
    '--ion-color-primary-contrast-rgb': '30,41,59',
    '--ion-color-primary-shade': '#e06255',
    '--ion-color-primary-tint': '#ff7d71',
    '--ion-color-secondary': '#6b5b95',
    '--ion-color-secondary-rgb': '107,91,149',
    '--ion-color-secondary-contrast': '#ffffff',
    '--ion-color-secondary-contrast-rgb': '255,255,255',
    '--ion-color-secondary-shade': '#5e4f83',
    '--ion-color-secondary-tint': '#7a6ca0',
    '--ion-color-tertiary': '#88b04b',
    '--ion-color-tertiary-rgb': '136,176,75',
    '--ion-color-tertiary-contrast': '#1e293b',
    '--ion-color-tertiary-contrast-rgb': '30,41,59',
    '--ion-color-tertiary-shade': '#799a42',
    '--ion-color-tertiary-tint': '#95b760',
    '--ion-color-success': '#009688',
    '--ion-color-success-rgb': '0,150,136',
    '--ion-color-success-contrast': '#ffffff',
    '--ion-color-success-contrast-rgb': '255,255,255',
    '--ion-color-success-shade': '#008476',
    '--ion-color-success-tint': '#1aa192',
    '--ion-color-warning': '#ffd166',
    '--ion-color-warning-rgb': '255,209,102',
    '--ion-color-warning-contrast': '#1e293b',
    '--ion-color-warning-contrast-rgb': '30,41,59',
    '--ion-color-warning-shade': '#e0b95a',
    '--ion-color-warning-tint': '#ffd679',
    '--ion-color-danger': '#ef476f',
    '--ion-color-danger-rgb': '239,71,111',
    '--ion-color-danger-contrast': '#ffffff',
    '--ion-color-danger-contrast-rgb': '255,255,255',
    '--ion-color-danger-shade': '#d24062',
    '--ion-color-danger-tint': '#f15a7e',
    '--ion-color-medium': '#5a6772',
    '--ion-color-medium-rgb': '90,103,114',
    '--ion-color-medium-contrast': '#ffffff',
    '--ion-color-medium-contrast-rgb': '255,255,255',
    '--ion-color-medium-shade': '#4f5a64',
    '--ion-color-medium-tint': '#6b7681',
    '--ion-color-light': '#f4f1de',
    '--ion-color-light-rgb': '244,241,222',
    '--ion-color-light-contrast': '#1e293b',
    '--ion-color-light-contrast-rgb': '30,41,59',
    '--ion-color-light-shade': '#d7d4c3',
    '--ion-color-light-tint': '#f5f2e1',
    '--ion-background-color': '#f4f1de',
    '--ion-background-color-rgb': '244,241,222',
    '--ion-text-color': '#1e293b',
    '--ion-text-color-rgb': '30,41,59',
    '--ion-toolbar-background': '#ff6f61',
    '--ion-toolbar-color': '#1e293b',
    '--searchbar-background': '#ffffff',
    '--searchbar-border-color': 'rgba(30,41,59,0.08)',
    '--searchbar-text-color': '#1e293b',
    '--searchbar-placeholder-color': 'rgba(30,41,59,0.55)',
    '--searchbar-icon-color': 'rgba(30,41,59,0.55)',
    '--searchbar-background-dark': 'rgba(255,255,255,0.08)',
    '--searchbar-border-color-dark': 'rgba(255,255,255,0.24)',
    '--searchbar-text-color-dark': '#f9fafb',
    '--searchbar-placeholder-color-dark': 'rgba(249,250,251,0.7)',
    '--searchbar-icon-color-dark': 'rgba(249,250,251,0.65)',
  },
  achromatopsia: {
    '--ion-color-primary': '#4b5563',
    '--ion-color-primary-rgb': '75,85,99',
    '--ion-color-primary-contrast': '#f9fafb',
    '--ion-color-primary-contrast-rgb': '249,250,251',
    '--ion-color-primary-shade': '#424b56',
    '--ion-color-primary-tint': '#5d6673',
    '--ion-color-secondary': '#6b7280',
    '--ion-color-secondary-rgb': '107,114,128',
    '--ion-color-secondary-contrast': '#f9fafb',
    '--ion-color-secondary-contrast-rgb': '249,250,251',
    '--ion-color-secondary-shade': '#5e646f',
    '--ion-color-secondary-tint': '#7a808c',
    '--ion-color-tertiary': '#9ca3af',
    '--ion-color-tertiary-rgb': '156,163,175',
    '--ion-color-tertiary-contrast': '#1f2933',
    '--ion-color-tertiary-contrast-rgb': '31,41,51',
    '--ion-color-tertiary-shade': '#88909a',
    '--ion-color-tertiary-tint': '#a6acb7',
    '--ion-color-success': '#4b5563',
    '--ion-color-success-rgb': '75,85,99',
    '--ion-color-success-contrast': '#f9fafb',
    '--ion-color-success-contrast-rgb': '249,250,251',
    '--ion-color-success-shade': '#424b56',
    '--ion-color-success-tint': '#5d6673',
    '--ion-color-warning': '#9ca3af',
    '--ion-color-warning-rgb': '156,163,175',
    '--ion-color-warning-contrast': '#1f2933',
    '--ion-color-warning-contrast-rgb': '31,41,51',
    '--ion-color-warning-shade': '#88909a',
    '--ion-color-warning-tint': '#a6acb7',
    '--ion-color-danger': '#6b7280',
    '--ion-color-danger-rgb': '107,114,128',
    '--ion-color-danger-contrast': '#f9fafb',
    '--ion-color-danger-contrast-rgb': '249,250,251',
    '--ion-color-danger-shade': '#5e646f',
    '--ion-color-danger-tint': '#7a808c',
    '--ion-color-medium': '#4b5563',
    '--ion-color-medium-rgb': '75,85,99',
    '--ion-color-medium-contrast': '#f9fafb',
    '--ion-color-medium-contrast-rgb': '249,250,251',
    '--ion-color-medium-shade': '#424b56',
    '--ion-color-medium-tint': '#5d6673',
    '--ion-color-light': '#f3f4f6',
    '--ion-color-light-rgb': '243,244,246',
    '--ion-color-light-contrast': '#1f2933',
    '--ion-color-light-contrast-rgb': '31,41,51',
    '--ion-color-light-shade': '#d6d7d8',
    '--ion-color-light-tint': '#f4f5f7',
    '--ion-background-color': '#f3f4f6',
    '--ion-background-color-rgb': '243,244,246',
    '--ion-text-color': '#1f2933',
    '--ion-text-color-rgb': '31,41,51',
    '--ion-toolbar-background': '#4b5563',
    '--ion-toolbar-color': '#f9fafb',
    '--searchbar-background': '#ffffff',
    '--searchbar-border-color': 'rgba(31,41,51,0.08)',
    '--searchbar-text-color': '#1f2933',
    '--searchbar-placeholder-color': 'rgba(31,41,51,0.55)',
    '--searchbar-icon-color': 'rgba(31,41,51,0.55)',
    '--searchbar-background-dark': 'rgba(255,255,255,0.08)',
    '--searchbar-border-color-dark': 'rgba(255,255,255,0.24)',
    '--searchbar-text-color-dark': '#f9fafb',
    '--searchbar-placeholder-color-dark': 'rgba(249,250,251,0.7)',
    '--searchbar-icon-color-dark': 'rgba(249,250,251,0.65)',
  },
};

const FONT_SCALE_VALUES: Record<FontScale, number> = {
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly autoPlayKey = 'instructionsAutoPlayEnabled';
  private readonly colorProfileKey = 'colorProfile';
  private readonly voiceCommandsKey = 'voiceCommandsEnabled';
  private readonly fontScaleKey = 'fontScalePreference';
  private readonly autoPlaySubject = new BehaviorSubject<boolean>(this.loadAutoPlayPreference());
  private readonly colorProfileSubject = new BehaviorSubject<ColorProfile>(this.loadColorProfile());
  private readonly voiceCommandsSubject = new BehaviorSubject<boolean>(this.loadVoiceCommandsPreference());
  private readonly fontScaleSubject = new BehaviorSubject<FontScale>(this.loadFontScale());

  readonly autoPlayEnabled$ = this.autoPlaySubject.asObservable();
  readonly colorProfile$ = this.colorProfileSubject.asObservable();
  readonly voiceCommandsEnabled$ = this.voiceCommandsSubject.asObservable();
  readonly fontScale$ = this.fontScaleSubject.asObservable();

  constructor(@Inject(DOCUMENT) private readonly documentRef: Document | null) {
    this.applyColorProfile(this.colorProfileSubject.value);
    this.applyFontScale(this.fontScaleSubject.value);
  }

  isAutoPlayEnabled(): boolean {
    return this.autoPlaySubject.value;
  }

  setAutoPlayEnabled(enabled: boolean): void {
    this.persistAutoPlay(enabled);
    this.autoPlaySubject.next(enabled);
  }

  isVoiceCommandsEnabled(): boolean {
    return this.voiceCommandsSubject.value;
  }

  setVoiceCommandsEnabled(enabled: boolean): void {
    this.persistVoiceCommands(enabled);
    this.voiceCommandsSubject.next(enabled);
  }

  getColorProfile(): ColorProfile {
    return this.colorProfileSubject.value;
  }

  setColorProfile(profile: ColorProfile): void {
    if (!COLOR_PROFILES[profile]) {
      return;
    }
    this.persistColorProfile(profile);
    this.colorProfileSubject.next(profile);
    this.applyColorProfile(profile);
  }

  applyStoredColorProfile(): void {
    this.applyColorProfile(this.colorProfileSubject.value);
  }

  getFontScale(): FontScale {
    return this.fontScaleSubject.value;
  }

  setFontScale(scale: FontScale): void {
    if (!FONT_SCALE_VALUES[scale]) {
      return;
    }
    this.persistFontScale(scale);
    this.fontScaleSubject.next(scale);
    this.applyFontScale(scale);
  }

  applyStoredFontScale(): void {
    this.applyFontScale(this.fontScaleSubject.value);
  }

  private loadAutoPlayPreference(): boolean {
    try {
      const stored = localStorage.getItem(this.autoPlayKey);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      /* ignore */
    }
    return true;
  }

  private loadColorProfile(): ColorProfile {
    try {
      const stored = localStorage.getItem(this.colorProfileKey) as ColorProfile | null;
      if (stored && stored in COLOR_PROFILES) {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return 'normal';
  }

  private loadVoiceCommandsPreference(): boolean {
    try {
      const stored = localStorage.getItem(this.voiceCommandsKey);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      /* ignore */
    }
    return true;
  }

  private loadFontScale(): FontScale {
    try {
      const stored = localStorage.getItem(this.fontScaleKey) as FontScale | null;
      if (stored && stored in FONT_SCALE_VALUES) {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return 'normal';
  }

  private persistAutoPlay(enabled: boolean): void {
    try {
      localStorage.setItem(this.autoPlayKey, enabled ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }

  private persistColorProfile(profile: ColorProfile): void {
    try {
      localStorage.setItem(this.colorProfileKey, profile);
    } catch {
      /* ignore */
    }
  }

  private persistVoiceCommands(enabled: boolean): void {
    try {
      localStorage.setItem(this.voiceCommandsKey, enabled ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }

  private persistFontScale(scale: FontScale): void {
    try {
      localStorage.setItem(this.fontScaleKey, scale);
    } catch {
      /* ignore */
    }
  }

  private applyColorProfile(profile: ColorProfile): void {
    const theme = COLOR_PROFILES[profile];
    if (!this.documentRef?.documentElement) {
      return;
    }
    const target = this.documentRef.documentElement;
    target.dataset['colorProfile'] = profile;
    if (this.documentRef.body) {
      this.documentRef.body.dataset['colorProfile'] = profile;
    }
    Object.entries(theme).forEach(([key, value]) => {
      target.style.setProperty(key, value);
    });
  }

  private applyFontScale(scale: FontScale): void {
    if (!this.documentRef?.documentElement) {
      return;
    }
    const multiplier = FONT_SCALE_VALUES[scale] ?? 1;
    const target = this.documentRef.documentElement;
    target.dataset['fontScale'] = scale;
    if (this.documentRef.body) {
      this.documentRef.body.dataset['fontScale'] = scale;
    }
    target.style.setProperty('--app-font-scale', multiplier.toString());
    target.style.setProperty('font-size', `${Math.round(multiplier * 100)}%`);
  }
}
