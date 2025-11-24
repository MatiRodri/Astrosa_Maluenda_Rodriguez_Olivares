import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../core/supabase.service';

export interface InstructionStep {
  id: number;
  order: number;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  localImageSrc?: string;
  localAudioSrc?: string;
}

export interface InstructionCategory {
  id: number;
  name: string;
  description: string;
  iconUrl?: string;
  tags: string[];
  steps: InstructionStep[];
  children: InstructionCategory[];
  viewCount: number;
  dangerLevel: number;
  riskScore: number;
}

interface CategoryRow {
  CategoryID: number;
  CategoryName: string;
  Description: string | null;
  IconURL: string | null;
  ParentCategoryID: number | null;
  Tags?: string[] | string | null;
  contador_vistas?: number | null;
  nivel_peligro?: number | null;
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
  tags: string[];
  parentId: number | null;
  steps: InstructionStep[];
  children: CategoryBuilder[];
  viewCount: number;
  dangerLevel: number;
  riskScore: number;
}

@Injectable({ providedIn: 'root' })
export class InstructionsService {
  private readonly supabase = inject(SupabaseService);

  private normalizeTags(value: unknown): string[] {
    if (!value) {
      return [];
    }

    const unique = new Set<string>();
    const pushTag = (tag: string) => {
      const cleaned = tag.trim();
      if (cleaned) {
        unique.add(cleaned);
      }
    };

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          pushTag(item);
        }
      }
      return Array.from(unique);
    }

    if (typeof value === 'string') {
      const parts = value
        .split(/[,;|\r?\n]/)
        .map(part => part.trim())
        .filter(Boolean);
      if (!parts.length) {
        pushTag(value);
      } else {
        parts.forEach(pushTag);
      }
      return Array.from(unique);
    }

    return [];
  }

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
      const rawTags = (row as any).Tags ?? (row as any).tags ?? null;
      const viewCount = this.resolveNumericValue(
        this.pickValue(row, [
          'contador_vistas',
          'Contador_vistas',
          'ContadorVistas',
          'counter_views',
          'CounterViews',
        ]) ?? 0,
      );
      const dangerLevel = Math.max(
        1,
        this.resolveNumericValue(
          this.pickValue(row, [
            'nivel_peligro',
            'Nivel_peligro',
            'NivelPeligro',
            'danger_level',
            'DangerLevel',
          ]) ?? 1,
        ) || 1,
      );
      builders.set(row.CategoryID, {
        id: row.CategoryID,
        name: row.CategoryName?.trim() || 'Sin titulo',
        description: row.Description?.trim() || '',
        iconUrl: row.IconURL ?? undefined,
        tags: this.normalizeTags(rawTags),
        parentId: row.ParentCategoryID,
        steps: [],
        children: [],
        viewCount,
        dangerLevel,
        riskScore: viewCount * dangerLevel,
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
        tags: [...builder.tags],
        steps: [...builder.steps],
        children,
        viewCount: builder.viewCount,
        dangerLevel: builder.dangerLevel,
        riskScore: builder.riskScore,
      };
    };

    return roots
      .map(convertBuilder)
      .filter((category): category is InstructionCategory => category !== null)
      .sort(sortByName);
  }

  async incrementCategoryViewCount(categoryId: number, currentValue = 0): Promise<number> {
    const client = this.supabase.getClient();
    const nextValue = Math.max(0, currentValue) + 1;
    const { error } = await client.rpc('incrementar_vista', {
      category_id_to_update: categoryId,
    });

    if (error) {
      throw new Error(error.message || 'No fue posible actualizar el contador de visitas.');
    }

    return nextValue;
  }

  private resolveNumericValue(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private pickValue(row: CategoryRow, keys: string[]): unknown {
    const source = row as unknown as Record<string, unknown>;
    for (const key of keys) {
      if (key in source && source[key] !== undefined && source[key] !== null) {
        return source[key];
      }
    }
    return undefined;
  }
}
