// src/services/weatherService.ts
'use client';
import { getWeatherAndLocation, WeatherLocationData } from '@/services/assignmentFunctionsService'; // Import necessary functions and types

export async function fetchWeather(lat: number, lng: number): Promise<WeatherLocationData | null> {
  // Call the backend function to get weather based on location
  console.log(`Fetching weather for location: ${lat}, ${lng}`);
  try {
    const weatherData = await getWeatherAndLocation(lat, lng);
    return weatherData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error; // Re-throw to be handled by the caller
  }
}
