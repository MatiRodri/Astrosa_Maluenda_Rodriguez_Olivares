import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface FeedbackPayload {
  categoryId: number;
  rating: number | null;
  comment: string;
  appVersion?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  constructor(private readonly supabase: SupabaseService) {}

  async submitFeedback(payload: FeedbackPayload): Promise<void> {
    const { categoryId, rating, comment, appVersion } = payload;

    const { error } = await this.supabase.getClient().from('feedback').insert({
      CategoryID: categoryId,
      Rating: rating,
      Comment: comment?.trim() || null,
      AppVersion: appVersion?.trim() || null,
    });

    if (error) {
      throw new Error(error.message || 'No fue posible enviar el feedback.');
    }
  }
}
