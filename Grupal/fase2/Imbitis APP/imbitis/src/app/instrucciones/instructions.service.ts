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
  children: InstructionCategory[];
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

interface CategoryBuilder {
  id: number;
  name: string;
  description: string;
  iconUrl?: string;
  parentId: number | null;
  steps: InstructionStep[];
  children: CategoryBuilder[];
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

    const builders = new Map<number, CategoryBuilder>();
    for (const row of categoryRows) {
      builders.set(row.CategoryID, {
        id: row.CategoryID,
        name: row.CategoryName?.trim() || 'Sin titulo',
        description: row.Description?.trim() || '',
        iconUrl: row.IconURL ?? undefined,
        parentId: row.ParentCategoryID,
        steps: [],
        children: [],
      });
    }

    const categoryIds = Array.from(builders.keys());
    const { data: steps, error: stepsError } = await client
      .from('steps')
      .select('*')
      .in('CategoryID', categoryIds)
      .order('StepNumber', { ascending: true });

    if (stepsError) {
      throw new Error(stepsError.message || 'No fue posible cargar los pasos.');
    }

    const stepsRows = (steps ?? []) as StepRow[];
    for (const step of stepsRows) {
      const builder = builders.get(step.CategoryID);
      if (!builder) {
        continue;
      }

      builder.steps.push({
        id: step.StepID,
        order: step.StepNumber ?? 0,
        text: step.InstructionText?.trim() || 'Paso sin descripcion',
        imageUrl: step.ImageURL ?? undefined,
        audioUrl: step.AudioURL ?? undefined,
      });
    }

    for (const builder of builders.values()) {
      builder.steps.sort((a, b) => a.order - b.order);
    }

    const roots: CategoryBuilder[] = [];
    for (const builder of builders.values()) {
      if (builder.parentId !== null) {
        const parent = builders.get(builder.parentId);
        if (parent) {
          parent.children.push(builder);
          continue;
        }
      }
      roots.push(builder);
    }

    const sortByName = (a: InstructionCategory, b: InstructionCategory): number =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });

    const convertBuilder = (builder: CategoryBuilder): InstructionCategory | null => {
      const children = builder.children
        .map(convertBuilder)
        .filter((child): child is InstructionCategory => child !== null);

      if (!builder.steps.length && !children.length) {
        return null;
      }

      children.sort(sortByName);

      return {
        id: builder.id,
        name: builder.name,
        description: builder.description,
        iconUrl: builder.iconUrl,
        steps: [...builder.steps],
        children,
      };
    };

    return roots
      .map(convertBuilder)
      .filter((category): category is InstructionCategory => category !== null)
      .sort(sortByName);
  }
}