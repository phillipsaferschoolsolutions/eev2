
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
export function formatDisplayDateShort(dateInput?: string | Date): string {
  if (!dateInput) return "N/A";

  let date: Date;
  if (typeof dateInput === 'string') {
    // Attempt to parse ISO string first, then fallback to direct Date constructor
    date = parseISO(dateInput);
    if (!isValid(date)) {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
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
