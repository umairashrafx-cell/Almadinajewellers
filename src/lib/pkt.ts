/**
 * Pakistan time, worked out by hand.
 *
 * The shop is in Mandi Bahauddin and so is nearly everybody reading its app,
 * but not everybody: a customer in Dubai or Manchester follows the same board,
 * and the shop asked for release times to be stated the way the bazaar states
 * them. So every time on the International tab is Pakistan time, whatever the
 * phone itself is set to, and says so.
 *
 * Pakistan keeps UTC+5 all year — no daylight saving since 2009 — so this is
 * a fixed offset rather than a trip through the Intl time zone database. That
 * makes it the same answer on every phone and in every test runner, including
 * an Android WebView whose ICU data is older than the app.
 */

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A Date whose UTC fields read as the wall clock in Pakistan, or null. */
function shifted(at: Date | string): Date | null {
  const when = typeof at === "string" ? new Date(at) : at;
  const ms = when.getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms + PKT_OFFSET_MS);
}

/** The day in Pakistan, "2026-11-18". Empty for anything that is not a time. */
export function pktDay(at: Date | string): string {
  const pk = shifted(at);
  if (!pk) return "";
  const month = String(pk.getUTCMonth() + 1).padStart(2, "0");
  const day = String(pk.getUTCDate()).padStart(2, "0");
  return `${pk.getUTCFullYear()}-${month}-${day}`;
}

/** The time in Pakistan on a twelve-hour clock, "6:30 PM". Empty for anything
 *  that is not a time. */
export function pktTime(at: Date | string): string {
  const pk = shifted(at);
  if (!pk) return "";
  const hours = pk.getUTCHours();
  const minutes = String(pk.getUTCMinutes()).padStart(2, "0");
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/** "Wed 10 Dec", for a "YYYY-MM-DD" day. Empty if it is not one. */
export function dayName(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** Whole days from one "YYYY-MM-DD" to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * What to call a day relative to today in Pakistan: "Today", "Tomorrow",
 * "Yesterday", or its name.
 */
export function pktDayLabel(day: string, now: Date = new Date()): string {
  const gap = daysBetween(pktDay(now), day);
  if (gap === 0) return "Today";
  if (gap === 1) return "Tomorrow";
  if (gap === -1) return "Yesterday";
  return dayName(day);
}

/**
 * How long until something, said the way a person would: "in 45 min",
 * "in 3 h 10 min", "in 4 days". Null once it has happened.
 */
export function timeUntil(at: Date | string, now: Date = new Date()): string | null {
  const when = typeof at === "string" ? Date.parse(at) : at.getTime();
  if (Number.isNaN(when)) return null;
  const minutes = Math.ceil((when - now.getTime()) / 60_000);
  if (minutes <= 0) return null;
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 48 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `in ${hours} h` : `in ${hours} h ${rest} min`;
  }
  return `in ${Math.round(minutes / (24 * 60))} days`;
}
