import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-emergencias',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './emergencias.page.html',
  styleUrls: ['./emergencias.page.scss'],
})
export class EmergenciasPage {}
