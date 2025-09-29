import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: false }
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) {
        return { ok: false, message: error.message };
      }

      return {
        ok: true,
        message: data.session ? 'Conexion correcta y sesion activa detectada.' : 'Conexion correcta. Sin sesion activa.'
      };
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : 'Error desconocido al contactar Supabase';
      return { ok: false, message };
    }
  }
}
