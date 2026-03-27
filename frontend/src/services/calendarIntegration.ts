export interface CalendarEventInput {
  title: string;
  description: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}


const formatGoogleDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

const escapeIcsText = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
};

const formatIcsDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

export const buildGoogleCalendarUrl = (event: CalendarEventInput): string => {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const dateRange = `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`;

  const params = new URLSearchParams({
    text: event.title,
    dates: dateRange,
    details: event.description,
    location: event.location ?? 'Ajo',
  });

  return `${baseUrl}&${params.toString()}`;
};

export const buildIcsContent = (events: CalendarEventInput[]): string => {
  const now = formatIcsDate(new Date());
  const body = events
    .map((event, index) => {
      return [
        'BEGIN:VEVENT',
        `UID:ajo-${Date.now()}-${index}@ajo.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatIcsDate(event.startDate)}`,
        `DTEND:${formatIcsDate(event.endDate)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(event.description)}`,
        `LOCATION:${escapeIcsText(event.location ?? 'Ajo')}`,
        'END:VEVENT',
      ].join('\n');
    })
    .join('\n');

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ajo//Calendar Integration//EN', body, 'END:VCALENDAR'].join('\n');
};

export const downloadIcsFile = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const createContributionReminderEvent = (
  groupName: string,
  contributionAmount: number,
  dueDate: Date
): CalendarEventInput => {
  const endDate = new Date(dueDate.getTime() + 30 * 60 * 1000);

  return {
    title: `Contribution Reminder: ${groupName}`,
    description: `Your contribution of $${contributionAmount} for ${groupName} is due.`,
    location: 'Ajo App',
    startDate: dueDate,
    endDate,
  };
};

export const createPayoutScheduleEvents = (
  groupName: string,
  payoutDates: Date[]
): CalendarEventInput[] => {
  return payoutDates.map((date, index) => ({
    title: `Payout Schedule: ${groupName}`,
    description: `Scheduled payout window #${index + 1} for ${groupName}.`,
    location: 'Ajo App',
    startDate: date,
    endDate: new Date(date.getTime() + 60 * 60 * 1000),
  }));
};
