// TypeScript types for triathlon results data

export interface SplitsSeconds {
  swim: number | null;
  t1: number | null;
  bike: number | null;
  t2: number | null;
  run: number | null;
}

export interface Ranks {
  total?: number;
  swim?: number;
  bike?: number;
  run?: number;
}

export interface Overtakes {
  bike?: number;
  run?: number;
}

export type Gender = 'M' | 'W';

export interface ResultEntry {
  id: string;
  name_public: string;
  gender: Gender;
  status: 'finished' | 'partial';
  splits_seconds: SplitsSeconds;
  total_seconds: number | null;
  ranks?: Ranks;
  overtakes?: Overtakes;
}

export interface ResultsSummary {
  finishers_count: number;
  total_seconds: {
    min: number;
    median: number;
    max: number;
  };
}

export interface ResultsYear {
  year: number;
  updated_at: string;
  entries: ResultEntry[];
  summary: ResultsSummary;
}

// Raw CSV row before processing
export interface RawResultRow {
  Name?: string;
  Gender?: string;
  Swim?: string;
  T1?: string;
  Bike?: string;
  T2?: string;
  Run?: string;
  Total?: string;
  'Swim Rank'?: string;
  'Bike Rank'?: string;
  'Run Rank'?: string;
  'Total Rank'?: string;
  'Bike Overtakes'?: string;
  'Run Overtakes'?: string;
  [key: string]: string | undefined;
}
