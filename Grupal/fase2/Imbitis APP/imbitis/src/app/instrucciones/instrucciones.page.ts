import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-instrucciones',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './instrucciones.page.html',
  styleUrls: ['./instrucciones.page.scss'],
})
export class InstruccionesPage implements OnInit {
  items: string[] = [
    'ATRAGANTAMIENTO',
    'QUEMADURA',
    'ATAQUE EPILEPTICO',
    'FRACTURA DE HUESO',
    'CONTUSION EN LA CABEZA',
    'DESMAYO'
  ];

  filteredItems: string[] = [];

  constructor() { }

  ngOnInit() {
    this.filteredItems = [...this.items];
  }

  onSearchChange(ev: any) {
    const query = (ev?.target?.value || '').toString().toLowerCase().trim();
    if (!query) {
      this.filteredItems = [...this.items];
      return;
    }
    this.filteredItems = this.items.filter(label =>
      label.toLowerCase().includes(query)
    );
  }

}
