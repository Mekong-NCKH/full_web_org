import { BadRequestException } from '@nestjs/common';

// A timezone is mandatory: never interpret the client's local clock as UTC.
export function parseTimestamp(value: unknown, name: string): Date {
  if (typeof value !== 'string')
    throw new BadRequestException(
      `${name} is required and must be an ISO 8601 timestamp with timezone`,
    );
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match)
    throw new BadRequestException(
      `${name} must be an ISO 8601 timestamp with timezone`,
    );
  const [, y, m, d, h, min, sec = '00', , zone] = match;
  const year = Number(y),
    month = Number(m),
    day = Number(d);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offsetHour = zone === 'Z' ? 0 : Number(zone.slice(1, 3));
  const offsetMinute = zone === 'Z' ? 0 : Number(zone.slice(4, 6));
  if (
    year < 100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > maxDay ||
    Number(h) > 23 ||
    Number(min) > 59 ||
    Number(sec) > 59 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    throw new BadRequestException(`${name} is not a valid date and time`);
  }
  const result = new Date(value);
  if (Number.isNaN(result.getTime()))
    throw new BadRequestException(`${name} is not a valid date and time`);
  return result;
}

export function parseLegacyDateTime(date: string, time: string): Date {
  const d = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!d || !t)
    throw new BadRequestException(
      'Expected date YYYY-MM-DD and time HH:mm[:ss]',
    );
  return parseTimestamp(
    `${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}T${t[1].padStart(2, '0')}:${t[2]}:${t[3] ?? '00'}+07:00`,
    'date/time',
  );
}
