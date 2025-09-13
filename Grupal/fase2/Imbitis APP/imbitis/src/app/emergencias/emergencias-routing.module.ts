import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EmergenciasPage } from './emergencias.page';

const routes: Routes = [
  {
    path: '',
    component: EmergenciasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmergenciasPageRoutingModule {}
