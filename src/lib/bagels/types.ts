// Type definitions for bagel reviews

export interface BagelReview {
  slug: string;
  restaurant: string;
  location: string;
  date: string;
  dateRaw: string;
  order: string;
  cost: string;
  costNumeric: number | null;
  upchargeAmount: string;
  upchargeNumeric: number | null;
  bagelSource: string;
  bagelReview: string;
  bagelRating: number | null;
  fillingsNotes: string;
  fillingsRating: number | null;
  serviceNotes: string;
  overallScore: number | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  photos: string[];
}

export interface BagelReviewsData {
  updatedAt: string;
  reviews: BagelReview[];
}
