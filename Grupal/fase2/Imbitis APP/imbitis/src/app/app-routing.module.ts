import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'instrucciones',
    pathMatch: 'full'
  },
  {
    path: 'instrucciones',
    loadChildren: () => import('./instrucciones/instrucciones.module').then( m => m.InstruccionesPageModule)
  },
  {
    path: 'emergencias',
    loadChildren: () => import('./emergencias/emergencias.module').then( m => m.EmergenciasPageModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then(m => m.SettingsPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
