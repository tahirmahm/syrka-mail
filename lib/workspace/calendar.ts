import type { CalendarEvent } from "./model";
export function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
export function shiftDay(day: string, amount: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return dateKey(d);
}
export function monthDays(day: string) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(1);
  const start = shiftDay(dateKey(d), -(d.getUTCDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, i) => shiftDay(start, i));
}
export function weekDays(day: string) {
  const d = new Date(day + "T12:00:00Z");
  const start = shiftDay(day, -((d.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
}
export function zonedValue(iso: string, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function zonedToIso(value: string, zone: string) {
  const base = Date.parse(value + "Z");
  if (!Number.isFinite(base)) throw new Error("Choose a valid date and time");
  const matches: string[] = [];
  for (let offset = -840; offset <= 840; offset += 15) {
    const iso = new Date(base + offset * 60000).toISOString();
    if (zonedValue(iso, zone) === value) matches.push(iso);
  }
  if (matches.length !== 1)
    throw new Error(
      matches.length
        ? "This time occurs twice because of daylight saving. Choose UTC or confirm an unambiguous time."
        : "This local time does not exist. Check the timezone and daylight-saving transition.",
    );
  return matches[0];
}
export function eventsForDay(
  events: CalendarEvent[],
  day: string,
  zone: string,
) {
  return events
    .filter((e) =>
      e.allDay
        ? e.start <= day && e.end > day
        : zonedValue(e.start, zone).slice(0, 10) <= day &&
          zonedValue(new Date(Date.parse(e.end) - 1).toISOString(), zone).slice(
            0,
            10,
          ) >= day,
    )
    .sort(
      (a, b) =>
        Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start),
    );
}

export function activeReminders(events: CalendarEvent[], now = Date.now()) {
  return events.filter((e) => {
    if (!e.reminderMinutes) return false;
    const start = Date.parse(
      e.allDay ? zonedToIso(e.start + "T00:00", e.timezone) : e.start,
    );
    return start > now && start - e.reminderMinutes * 60000 <= now;
  });
}
