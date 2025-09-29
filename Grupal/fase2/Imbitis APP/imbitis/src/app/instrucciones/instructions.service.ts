import { Injectable } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';

export interface InstructionStep {
  id: number;
  order: number;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface InstructionCategory {
  id: number;
  name: string;
  description: string;
  iconUrl?: string;
  steps: InstructionStep[];
}

interface CategoryRow {
  CategoryID: number;
  CategoryName: string;
  Description: string | null;
  IconURL: string | null;
  ParentCategoryID: number | null;
}

interface StepRow {
  StepID: number;
  CategoryID: number;
  StepNumber: number | null;
  InstructionText: string | null;
  ImageURL: string | null;
  AudioURL: string | null;
}

@Injectable({ providedIn: 'root' })
export class InstructionsService {
  constructor(private readonly supabase: SupabaseService) {}

  async fetchInstructions(): Promise<InstructionCategory[]> {
    const client = this.supabase.getClient();

    const { data: categories, error: categoriesError } = await client
      .from('categories')
      .select('*')
      .order('CategoryName', { ascending: true });

    if (categoriesError) {
      throw new Error(categoriesError.message || 'No fue posible cargar las categorias.');
    }

    const categoryRows = (categories ?? []) as CategoryRow[];

    if (!categoryRows.length) {
      return [];
    }

    const categoryIds = categoryRows.map(row => row.CategoryID);

    const { data: steps, error: stepsError } = await client
      .from('steps')
      .select('*')
      .in('CategoryID', categoryIds)
      .order('StepNumber', { ascending: true });

    if (stepsError) {
      throw new Error(stepsError.message || 'No fue posible cargar los pasos.');
    }

    const stepsRows = (steps ?? []) as StepRow[];
    const stepsByCategory = new Map<number, StepRow[]>();

    for (const step of stepsRows) {
      const list = stepsByCategory.get(step.CategoryID) ?? [];
      list.push(step);
      stepsByCategory.set(step.CategoryID, list);
    }

    return categoryRows.map<InstructionCategory>(row => ({
      id: row.CategoryID,
      name: row.CategoryName?.trim() || 'Sin titulo',
      description: row.Description?.trim() || '',
      iconUrl: row.IconURL ?? undefined,
      steps: (stepsByCategory.get(row.CategoryID) ?? [])
        .sort((a, b) => (a.StepNumber ?? 0) - (b.StepNumber ?? 0))
        .map<InstructionStep>(step => ({
          id: step.StepID,
          order: step.StepNumber ?? 0,
          text: step.InstructionText?.trim() || 'Paso sin descripcion',
          imageUrl: step.ImageURL ?? undefined,
          audioUrl: step.AudioURL ?? undefined,
        })),
    }));
  }
}
