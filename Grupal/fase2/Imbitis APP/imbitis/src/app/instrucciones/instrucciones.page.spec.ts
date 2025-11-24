import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { SpeechRecognition } from '@awesome-cordova-plugins/speech-recognition/ngx';
import { InstruccionesPage } from './instrucciones.page';
import { InstructionsService } from './instructions.service';
import { UserPreferencesService } from '../core/user-preferences.service';
import { FeedbackService } from '../core/feedback.service';
import { EmergencyCallService } from '../core/emergency-call.service';
import { InstructionFavoritesService } from './instruction-favorites.service';
import { VoiceCommandService } from '../core/voice-command.service';
import { InstructionOfflineService } from './instruction-offline.service';

describe('InstruccionesPage', () => {
  let component: InstruccionesPage;
  let fixture: ComponentFixture<InstruccionesPage>;

  beforeEach(() => {
    const instructionsMock = {
      fetchInstructions: jasmine.createSpy().and.returnValue(Promise.resolve([])),
      incrementCategoryViewCount: jasmine.createSpy().and.returnValue(Promise.resolve(0)),
    };
    const preferencesMock = {
      autoPlayEnabled$: of(true),
      colorProfile$: of('normal'),
      voiceCommandsEnabled$: of(true),
      fontScale$: of('normal'),
      isAutoPlayEnabled: () => true,
      isVoiceCommandsEnabled: () => true,
      getColorProfile: () => 'normal',
      getFontScale: () => 'normal',
      setAutoPlayEnabled: () => {},
      setVoiceCommandsEnabled: () => {},
      setColorProfile: () => {},
      setFontScale: () => {},
    };
    const favoritesMock = {
      favorites$: of([]),
      toggleFavorite: () => {},
      isFavorite: () => false,
    };
    const offlineRecords$ = new Subject<any[]>();
    const offlineMock = {
      records$: offlineRecords$.asObservable(),
      getOfflineCategories: () => [],
      hasCategory: () => false,
      saveCategory: () => {},
      removeCategory: () => {},
    };
    const voiceMock = {
      activate: () => Promise.resolve('unavailable'),
      deactivate: () => Promise.resolve(),
      isListening: false,
    };
    const speechMock = {
      isRecognitionAvailable: () => Promise.resolve(false),
      hasPermission: () => Promise.resolve(false),
      requestPermission: () => Promise.resolve(),
      startListening: () => of([]),
      stopListening: () => Promise.resolve(),
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, InstruccionesPage],
      providers: [
        { provide: InstructionsService, useValue: instructionsMock },
        { provide: UserPreferencesService, useValue: preferencesMock },
        { provide: FeedbackService, useValue: {} },
        { provide: EmergencyCallService, useValue: { openEmergencyMenu: () => Promise.resolve() } },
        { provide: InstructionFavoritesService, useValue: favoritesMock },
        { provide: VoiceCommandService, useValue: voiceMock },
        { provide: InstructionOfflineService, useValue: offlineMock },
        { provide: SpeechRecognition, useValue: speechMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstruccionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
