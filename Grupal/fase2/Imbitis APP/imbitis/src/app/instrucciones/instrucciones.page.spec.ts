import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstruccionesPage } from './instrucciones.page';

describe('InstruccionesPage', () => {
  let component: InstruccionesPage;
  let fixture: ComponentFixture<InstruccionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InstruccionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
