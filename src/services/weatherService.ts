// src/services/weatherService.ts

export async function fetchWeather(location: string): Promise<any> {
  // Basic placeholder function for fetching weather data
  console.log(`Fetching weather for location: ${location}`);
  // In a real application, you would make an API call here
  return {
    location: location,
    temperature: 70,
    conditions: 'Sunny',
    icon: '☀️'
  };
}