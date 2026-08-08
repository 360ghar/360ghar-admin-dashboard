export const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'builder_floor', label: 'Builder Floor' },
  { value: 'room', label: 'Room' },
  { value: 'villa', label: 'Villa' },
  { value: 'plot', label: 'Plot' },
  { value: 'condo', label: 'Condo' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'loft', label: 'Loft' },
  { value: 'pg', label: 'PG' },
  { value: 'flatmate', label: 'Flatmate' },
  { value: 'office', label: 'Office' },
  { value: 'shop', label: 'Shop' },
  { value: 'warehouse', label: 'Warehouse' },
] as const

export const PROPERTY_PURPOSES = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'short_stay', label: 'Short Stay' },
] as const

export const PROPERTY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'under_offer', label: 'Under Offer' },
  { value: 'rented', label: 'Rented' },
  { value: 'sold', label: 'Sold' },
  { value: 'maintenance', label: 'Maintenance' },
] as const

export const PROPERTY_FEATURES = [
  'gym', 'pool', 'parking', 'security', 'lift', 'power_backup',
  'garden', 'play_area', 'club_house', 'jogging_track', 'rainwater_harvesting',
  'solar_panels', 'intercom', 'cctv', 'fire_safety', 'waste_disposal',
] as const

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'distance', label: 'Distance' },
  { value: 'popular', label: 'Most Popular' },
] as const

export const KITCHEN_TYPE_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'non_vegetarian', label: 'Non-Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'any', label: 'Any Kitchen' },
] as const

export const VENTILATION_TYPE_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'average', label: 'Average' },
  { value: 'poor', label: 'Poor' },
] as const

export const FURNISHING_LEVEL_OPTIONS = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
] as const
