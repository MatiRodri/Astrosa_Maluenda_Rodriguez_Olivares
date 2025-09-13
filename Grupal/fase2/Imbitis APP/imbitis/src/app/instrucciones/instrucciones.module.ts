// src/app/instrucciones/instrucciones.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { InstruccionesPageRoutingModule } from './instrucciones-routing.module';
import { InstruccionesPage } from './instrucciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InstruccionesPageRoutingModule,
    InstruccionesPage
  ]
})
export class InstruccionesPageModule {}
