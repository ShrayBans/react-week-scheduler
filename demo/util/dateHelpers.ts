import {
  getDay,
  getHours,
  getMinutes,
  setDay,
  setHours,
  setMinutes,
  startOfWeek,
} from 'date-fns';
import compareAsc from 'date-fns/compare_asc';
import { map } from 'lodash';
import moment from 'moment-timezone';
import { CalendarEvent } from '../../src/types';

/**
 * Transforms Google Calendar Event into TimeGridScheduler Event
 */
export const transformGcalEvents = (
  currentEvents: any[],
  weekStart = 1,
  originDate = startOfWeek(moment.utc().toDate(), {
    weekStartsOn: weekStart,
  }),
): Partial<CalendarEvent>[] => {
  console.log('currentEvents', currentEvents);
  return map(currentEvents, event => {
    const startTime = setMinutes(
      setHours(
        setDay(originDate, getDay(event.start.dateTime), {
          weekStartsOn: weekStart,
        }),
        getHours(event.start.dateTime),
      ),
      getMinutes(event.start.dateTime),
    );
    const endTime = setMinutes(
      setHours(
        setDay(originDate, getDay(event.end.dateTime), {
          weekStartsOn: weekStart,
        }),
        getHours(event.end.dateTime),
      ),
      getMinutes(event.end.dateTime),
    );

    return {
      id: event.id,
      startTime: startTime,
      endTime: endTime,
      htmlLink: event.htmlLink,
      summary: event.summary,
      description: event.description,
      ranges: [startTime, endTime] as any,
    };
  }).sort(event => compareAsc(event.startTime, event.endTime));
};
