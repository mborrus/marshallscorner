// Type definitions for Turkey Trot race data

export interface TurkeyTrotRunner {
  id: string;
  name: string;
  gender: 'M' | 'F';
  age: number;
  year: number;
  finishTimeSeconds: number;
  overallPlace: number;
  genderPlace: number;
  ageGroupPlace: number;
  ageGroup: string;
  city: string;
  state: string;
  bib: string;
}

export interface TurkeyTrotYearStats {
  year: number;
  totalRunners: number;
  maleCount: number;
  femaleCount: number;
  fastestTimeSeconds: number;
  slowestTimeSeconds: number;
  medianTimeSeconds: number;
  averageTimeSeconds: number;
}

export interface TurkeyTrotDivisionStats {
  ageGroup: string;
  count: number;
  averageTimeSeconds: number;
  fastestTimeSeconds: number;
}

export interface TurkeyTrotCourseRecord {
  category: string;
  name: string;
  year: number;
  timeSeconds: number;
  gender?: 'M' | 'F';
  ageGroup?: string;
}

export interface TurkeyTrotHeadToHead {
  runner1: string;
  runner2: string;
  races: {
    year: number;
    runner1Time: number;
    runner2Time: number;
    winner: string;
  }[];
  runner1Wins: number;
  runner2Wins: number;
}

export interface TurkeyTrotData {
  updatedAt: string;
  runners: TurkeyTrotRunner[];
}
