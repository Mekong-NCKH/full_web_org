import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

function haveSameDate(
  _date1: dayjs.ConfigType,
  _date2: dayjs.ConfigType,
): boolean {
  const date1 = dayjs(_date1);
  const date2 = dayjs(_date2);
  return date1.format('MM DD YYYY') === date2.format('MM DD YYYY');
}

function formatVideoTime(time: number) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time - 60 * minutes);
  const timeString =
    minutes.toString().padStart(2, '0') +
    ':' +
    seconds.toString().padStart(2, '0');
  return timeString;
}

function formatDuration(durationSeconds: number): string {
  const dur = dayjs.duration(durationSeconds, 'seconds');
  const hours = dur.hours();
  const minutes = dur.minutes();

  const parts = [];
  if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);

  return parts.join(' ') || '0 minutes';
}

function formatTimeAndDate(timestamp: number): {
  time: string;
  date: string;
} {
  const date = dayjs.unix(timestamp);
  const formattedTime = date.format('HH:mm');
  const formattedDate = date.format('DD/MM/YYYY');

  return {
    time: formattedTime,
    date: formattedDate,
  };
}

export { haveSameDate, formatVideoTime, formatDuration, formatTimeAndDate };
