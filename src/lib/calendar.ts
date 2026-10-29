import type { Account } from "@/lib/types";

/** Offset (ms) of `timeZone` from UTC at the instant `date`. */
function tzOffsetMs(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - date.getTime();
}

/** The UTC instant of a wall-clock time in `timeZone`. */
export function zonedTime(y: number, m: number, d: number, hour: number, minute: number, timeZone: string) {
  const guess = Date.UTC(y, m, d, hour, minute);
  const first = guess - tzOffsetMs(new Date(guess), timeZone);
  // Second pass corrects for a DST change between the guess and the answer.
  return new Date(guess - tzOffsetMs(new Date(first), timeZone));
}

function localDate(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { y: +parts.year, m: +parts.month - 1, d: +parts.day, weekday: parts.weekday as string };
}

export interface Slot {
  start: Date;
  end: Date;
}

/**
 * Free meeting slots over the next business days, at least `leadHours` from
 * now, skipping slots that overlap `busy`.
 */
export function availableSlots(account: Account, busy: Slot[], count = 6, leadHours = 20): Slot[] {
  const tz = account.timezone || "UTC";
  const minutes = account.meeting_minutes || 30;
  const earliest = Date.now() + leadHours * 3_600_000;
  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset < 14 && slots.length < count; dayOffset++) {
    const day = localDate(new Date(Date.now() + dayOffset * 86_400_000), tz);
    if (day.weekday === "Sat" || day.weekday === "Sun") continue;
    // Offer at most two slots per day, spread across the morning and afternoon.
    const hours = [account.working_hours_start + 1, Math.max(account.working_hours_start + 1, account.working_hours_end - 3)];
    for (const hour of new Set(hours)) {
      const start = zonedTime(day.y, day.m, day.d, hour, 0, tz);
      const end = new Date(start.getTime() + minutes * 60_000);
      if (start.getTime() < earliest) continue;
      if (busy.some((b) => start < b.end && end > b.start)) continue;
      slots.push({ start, end });
      if (slots.length >= count) break;
    }
  }
  return slots;
}

export function formatSlot(slot: Slot, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(slot.start);
}

function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** An iCalendar invite (METHOD:REQUEST) both sides can accept. */
export function meetingInvite(opts: {
  uid: string;
  slot: Slot;
  title: string;
  description: string;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
  location?: string | null;
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Leadloop//Agent//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(opts.slot.start)}`,
    `DTEND:${icsDate(opts.slot.end)}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(opts.description)}`,
    opts.location ? `LOCATION:${icsEscape(opts.location)}` : "",
    `ORGANIZER;CN=${icsEscape(opts.organizer.name)}:mailto:${opts.organizer.email}`,
    `ATTENDEE;CN=${icsEscape(opts.attendee.name)};RSVP=TRUE:mailto:${opts.attendee.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}
