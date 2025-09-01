
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatDateFns, isValid, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string or Date object into a short display format (e.g., "Jun 3").
 * @param dateInput The date string (ISO format preferred) or Date object.
 * @returns Formatted date string or "N/A" if input is invalid/missing.
 */
export function formatDisplayDateShort(dateInput?: string | Date | any): string {
  if (!dateInput) return "N/A";

  let date: Date;
  
  // Handle Firestore Timestamp objects
  if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
    date = dateInput.toDate();
  } else if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
    // Handle Firestore timestamp with seconds
    date = new Date(dateInput.seconds * 1000);
  } else if (dateInput && typeof dateInput === 'object' && dateInput._seconds) {
    // Handle Firestore timestamp with _seconds
    date = new Date(dateInput._seconds * 1000);
  } else if (typeof dateInput === 'string') {
    // Handle the backend's convertTime format: "Monday, January 1, 2024 at 12:00:00 PM"
    if (dateInput.includes(' at ')) {
      // Parse the backend's formatted string
      const datePart = dateInput.split(' at ')[0];
      const timePart = dateInput.split(' at ')[1];
      
      // Try to parse the date part
      const parsedDate = new Date(datePart + ', ' + new Date().getFullYear() + ' ' + timePart);
      if (isValid(parsedDate)) {
        date = parsedDate;
      } else {
        // Fallback to direct Date constructor
        date = new Date(dateInput);
      }
    } else {
      // Attempt to parse ISO string first, then fallback to direct Date constructor
      date = parseISO(dateInput);
      if (!isValid(date)) {
        date = new Date(dateInput);
      }
    }
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    // Fallback for unknown types
    date = new Date(dateInput);
  }

  if (!isValid(date)) {
    // console.warn("formatDisplayDateShort: Received invalid date input:", dateInput);
    return "Invalid Date";
  }

  try {
    return formatDateFns(date, "MMM d"); // e.g., "Jun 3"
  } catch (e) {
    console.error("Error formatting date with date-fns:", dateInput, e);
    return String(dateInput).substring(0, 10); // Fallback to a basic string representation
  }
}
