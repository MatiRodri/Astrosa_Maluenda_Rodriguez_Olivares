import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmergenciasPage } from './emergencias.page';

describe('EmergenciasPage', () => {
  let component: EmergenciasPage;
  let fixture: ComponentFixture<EmergenciasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmergenciasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
