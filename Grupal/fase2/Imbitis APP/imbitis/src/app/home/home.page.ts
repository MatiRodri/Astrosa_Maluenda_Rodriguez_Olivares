import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  connectionMessage = '';
  connectionOk: boolean | null = null;

  constructor(private readonly supabaseService: SupabaseService) {}

  ngOnInit(): void {
    void this.checkConnection();
  }

  async checkConnection(): Promise<void> {
    const result = await this.supabaseService.testConnection();
    this.connectionOk = result.ok;
    this.connectionMessage = result.message;
  }
}
