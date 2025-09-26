import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';

interface InstructionItem {
  id: string;
  label: string;
  image: string;
  steps: string[];
}

@Component({
  selector: 'app-instrucciones',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './instrucciones.page.html',
  styleUrls: ['./instrucciones.page.scss'],
})
export class InstruccionesPage implements OnInit {
  private readonly items: InstructionItem[] = [
    {
      id: 'atragantamiento',
      label: 'ATRAGANTAMIENTO',
      image: 'assets/instrucciones/atragantamiento.png',
      steps: [
        'Evalúa rápidamente si la persona puede toser o hablar.',
        'Ubícate detrás de la persona y rodea la cintura con tus brazos.',
        'Realiza 5 compresiones abdominales hacia adentro y arriba (maniobra de Heimlich).',
        'Alterna con 5 palmadas fuertes en la espalda entre los omóplatos.',
        'Si la persona pierde el conocimiento, llama a emergencias y empieza RCP.'
      ],
    },
    {
      id: 'quemadura',
      label: 'QUEMADURA',
      image: 'assets/instrucciones/quemadura.png',
      steps: [
        'Retira a la persona de la fuente de calor de forma segura.',
        'Enfría la zona con agua tibia (no helada) durante al menos 10 minutos.',
        'Quita accesorios ajustados (anillos, pulseras) antes de que se inflame.',
        'Cubre la quemadura con una gasa estéril o paño limpio sin presionar.',
        'Busca atención médica si la quemadura es grave o muy extensa.'
      ],
    },
    {
      id: 'ataque-epileptico',
      label: 'ATAQUE EPILEPTICO',
      image: 'assets/instrucciones/ataque-epileptico.png',
      steps: [
        'Mantén la calma y quita objetos alrededor que puedan causar lesiones.',
        'Coloca algo blando bajo la cabeza y afloja prendas ajustadas.',
        'No intentes sujetar a la persona ni introduzcas objetos en su boca.',
        'Cronometra la duración de la convulsión; si supera 5 minutos llama a emergencias.',
        'Cuando cese, coloca a la persona de lado y permanece hasta que recupere la conciencia.'
      ],
    },
    {
      id: 'fractura-de-hueso',
      label: 'FRACTURA DE HUESO',
      image: 'assets/instrucciones/fractura-de-hueso.png',
      steps: [
        'Inmoviliza la zona lesionada tal como está; no intentes enderezar la extremidad.',
        'Aplica una férula improvisada con tablas o revistas acolchadas si es posible.',
        'Reduce inflamación con compresas frías envueltas en tela.',
        'Mantén elevada la extremidad lesionada si no causa dolor.',
        'Traslada a la persona a un centro médico o llama a emergencias.'
      ],
    },
    {
      id: 'contusion-cabeza',
      label: 'CONTUSIÓN EN LA CABEZA',
      image: 'assets/instrucciones/contusion-en-la-cabeza.png',
      steps: [
        'Evalúa si hay pérdida de conciencia, vómito o confusión; de ser así, llama a emergencias.',
        'Aplica compresas frías sobre la zona golpeada durante lapsos de 10 minutos.',
        'Mantén a la persona en reposo y despierta por al menos 30 minutos.',
        'Observa signos de empeoramiento (dolor intenso, somnolencia, sangrado).',
        'Busca asistencia médica si los síntomas persisten o empeoran.'
      ],
    },
    {
      id: 'desmayo',
      label: 'DESMAYO',
      image: 'assets/instrucciones/desmayo.png',
      steps: [
        'Coloca a la persona boca arriba y eleva sus piernas aproximadamente 30 cm.',
        'Afloja prendas ajustadas y asegura buena ventilación.',
        'Si hay vómito, coloca a la persona de lado para evitar aspiraciones.',
        'Comprueba respiración y pulso; si faltan, inicia RCP y llama a emergencias.',
        'Cuando recupere la conciencia, ofrece agua y mantén reposo unos minutos.'
      ],
    },
  ];

  filteredItems: InstructionItem[] = [];
  selectedItem: InstructionItem | null = null;
  currentStepIndex = 0;
  activeCardId: string | null = null;
  showSteps = false;

  constructor(private readonly alertCtrl: AlertController) {}

  ngOnInit() {
    this.filteredItems = [...this.items];
  }

  onSearchChange(ev: any) {
    const query = (ev?.target?.value || '').toString().toLowerCase().trim();
    if (!query) {
      this.filteredItems = [...this.items];
      return;
    }
    this.filteredItems = this.items.filter(item =>
      item.label.toLowerCase().includes(query)
    );
  }

  openSteps(item: InstructionItem) {
    this.selectedItem = item;
    this.currentStepIndex = 0;
    this.showSteps = true;
    this.activeCardId = item.id;
    setTimeout(() => {
      if (this.activeCardId === item.id) {
        this.activeCardId = null;
      }
    }, 400);
  }

  closeSteps() {
    this.showSteps = false;
    this.selectedItem = null;
    this.currentStepIndex = 0;
  }

  nextStep() {
    if (!this.selectedItem) { return; }
    if (this.currentStepIndex < this.selectedItem.steps.length - 1) {
      this.currentStepIndex++;
    }
  }

  previousStep() {
    if (!this.selectedItem) { return; }
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
  }

  async callEmergency() {
    const alert = await this.alertCtrl.create({
      header: 'Emergencia',
      message: '¿Deseas llamar a los servicios de emergencia?',
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