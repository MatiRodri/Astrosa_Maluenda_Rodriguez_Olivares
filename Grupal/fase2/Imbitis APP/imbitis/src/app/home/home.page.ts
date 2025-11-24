import { Component, OnInit, inject } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';
import { EmergencyCallService } from '../core/emergency-call.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  private readonly supabaseService = inject(SupabaseService);
  private readonly emergencyCallService = inject(EmergencyCallService);
  connectionMessage = '';
  connectionOk: boolean | null = null;

  ngOnInit(): void {
    void this.checkConnection();
  }

  async checkConnection(): Promise<void> {
    const result = await this.supabaseService.testConnection();
    this.connectionOk = result.ok;
    this.connectionMessage = result.message;
  }

  openEmergencyMenu(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    void this.emergencyCallService.openEmergencyMenu();
  }
}
