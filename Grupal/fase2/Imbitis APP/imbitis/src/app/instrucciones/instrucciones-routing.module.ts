import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InstruccionesPage } from './instrucciones.page';

const routes: Routes = [
  {
    path: '',
    component: InstruccionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InstruccionesPageRoutingModule {}
