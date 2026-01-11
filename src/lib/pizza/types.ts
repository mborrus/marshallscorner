// Type definitions for pizza reviews

export interface PizzaRatings {
  crustTexture: number | null;
  undercarriage: number | null;
  flavorOfCrust: number | null;
  integrity: number | null;
  mouthCutter: number | null;
  edge: number | null;
  sauce: number | null;
  choices: number | null;
  toppingsPresentation: number | null;
  madeInHouse: number | null;
  upchargeRating: number | null;
  service: number | null;
}

export interface PizzaReview {
  slug: string;
  restaurant: string;
  location: string;
  date: string;
  dateRaw: string;
  pizzaOrdered: string;
  cost: string;
  costNumeric: number | null;
  upchargeAmount: string;
  upchargeNumeric: number | null;
  toppings: string;
  overallFlavorVibes: string;
  textureDescriptor: string;
  crustBrand: string;
  serviceNotes: string;
  ratings: PizzaRatings;
  overallScore: number | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  googleMapsUrl: string | null;
  website: string | null;
}

export interface PizzaReviewsData {
  updatedAt: string;
  reviews: PizzaReview[];
}
