// @ts-ignore
import React, { useContext } from 'react';
import { SchedulerContext } from '../context';
import { CalendarEvent, ClassNames } from '../types';
import { getFormattedComponentsForDateRange } from '../utils/getTextForDateRange';

export type EventContentProps = {
  width: number;
  height: number;
  classes: ClassNames;
  calendarEvent: CalendarEvent;
  isStart: boolean;
  isEnd: boolean;
};

export const DefaultEventContent = React.memo(function EventContent({
  width,
  height,
  classes,
  calendarEvent,
  isStart,
  isEnd,
}: EventContentProps) {
  const { locale } = useContext(SchedulerContext);
  const [start, end] = getFormattedComponentsForDateRange({
    dateRange: calendarEvent.ranges as [Date, Date],
    locale,
    includeDayIfSame: false,
  });

  return (
    <div
      style={{ width: width - 20, height }}
      className={classes['event-content']}
    >
      {/* <VisuallyHidden>
        {getTextForDateRange({
          dateRange: calendarEvent.ranges as [Date, Date],
          locale,
        })}
      </VisuallyHidden> */}
      <span aria-hidden className={classes['event-name']}>
        {calendarEvent.summary}
      </span>
      <span aria-hidden className={classes.end}>
        {isStart && start}
      </span>
      <span aria-hidden className={classes.end}>
        {isEnd && ` - ${end}`}
      </span>
    </div>
  );
});
