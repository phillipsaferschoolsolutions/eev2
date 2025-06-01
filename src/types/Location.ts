
// src/types/Location.ts

export interface Location {
  id: string; // Unique identifier for the location, good for React keys
  locationName: string; // Display name of the location and the value to be captured
  address?: string; // Optional address
  account?: string; // Account this location belongs to
  // Add any other relevant fields that your API might return
  [key: string]: any; // Allow other properties
}
