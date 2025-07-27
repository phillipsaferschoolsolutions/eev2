export interface WeatherForecast {
    date: string;
    day: string;
    temp: number;
    condition: string;
    icon: string;
    precipitation: number;
  }
  
  export interface CompletionItem {
    id: string;
    parentAssignmentId?: string;
    data: {
      assessmentName?: string;
      locationName?: string;
      completedBy?: string;
      completionDate?: string; // ISO string or readable
      submittedTimeServer?: string;
      [key: string]: unknown;
    };
  }