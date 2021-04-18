import useComponentSize from '@rehooks/component-size';
import classcat from 'classcat';
import addDays from 'date-fns/add_days';
import addHours from 'date-fns/add_hours';
import format from 'date-fns/format';
import isDateEqual from 'date-fns/is_equal';
import startOfDay from 'date-fns/start_of_day';
import { concat, filter, get, head, map } from 'lodash';
import isEqual from 'lodash/isEqual';
import times from 'lodash/times';
import moment from 'moment-timezone';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import scrollIntoView from 'scroll-into-view-if-needed';
import { SchedulerContext } from '../context';
import { useClickAndDrag } from '../hooks/useClickAndDrag';
import { useMousetrap } from '../hooks/useMousetrap';
import {
  CalendarCustomizations,
  CalendarEvent,
  CalendarEventCache,
  CellInfo,
  ClassNames,
  DateRange,
  Grid,
  OnChangeCallback,
} from '../types';
import { createGrid } from '../utils/createGrid';
import { createMapCellInfoToRecurringTimeRange } from '../utils/createMapCellInfoToRecurringTimeRange';
import { createMapDateRangeToCells } from '../utils/createMapDateRangeToCells';
import { getEarliestTimeRange } from '../utils/getEarliestTimeRange';
import { getSpan } from '../utils/getSpan';
import { Cell } from './Cell';
import { Schedule, ScheduleProps } from './Schedule';

const MINS_IN_DAY = 24 * 60;
const horizontalPrecision = 1;
const toDay = (x: number): number => x * horizontalPrecision;
const toX = (days: number): number => days / horizontalPrecision;
const DELETE_KEYS = ['del', 'backspace'];

export const TimeGridScheduler = React.memo(function TimeGridScheduler({
  calendarCustomizations,
  style,
  schedule,
  allCachedEvents,
  originDate: _originDate = new Date(),
  defaultHours = [9, 15],
  classes,
  className,
  addEvent,
  editEvent,
  deleteEvent,
  selectEvent,
  selectedEvent,
  onEventClick,
  eventContentComponent,
  eventRootComponent,
  disabled,
}: {
  originDate?: Date;

  calendarCustomizations: CalendarCustomizations;
  // /**
  //  * The minimum number of minutes a created range can span
  //  * @default 30
  //  */
  // visualGridPrecision?: number;

  // /**
  //  * The visual grid increments in minutes.
  //  * @default 30
  //  */
  // visualGridPrecision?: number;

  // /**
  //  * The minimum number of minutes for an time block
  //  * created with a single click.
  //  * @default visualGridPrecision
  //  */
  // clickPrecision?: number;

  /** Custom styles applied to the root of the view */
  style?: React.CSSProperties;
  schedule: CalendarEvent[];
  allCachedEvents: CalendarEventCache;

  /**
   * A map of class names to the scoped class names
   * The keys are class names like `'root'` and the values
   * are the corresponding class names which can be scoped
   * with CSS Modules, e.g. `'_root_7f2c6'`.
   */
  classes: ClassNames;
  className?: string;

  /**
   * The view will initially be scrolled to these hours.
   * Defaults to work hours (9-17).
   * @default [9, 17]
   */
  defaultHours?: [number, number];
  addEvent(newSchedule: CalendarEvent): void;
  editEvent(eventId: string, newSchedule: CalendarEvent): void;
  deleteEvent(eventId: string): void;
  selectEvent(newSchedule: CalendarEvent): void;
  selectedEvent: CalendarEvent;
  onEventClick?: ScheduleProps['onClick'];
  eventContentComponent?: ScheduleProps['eventContentComponent'];
  eventRootComponent?: ScheduleProps['eventRootComponent'];
  disabled?: boolean;
}) {
  const {
    dragPrecision = 30,
    visualGridPrecision = 30,
    clickPrecision = 30,
    timeframe = 'week',
    weekStart = 1,
    hourStart = 0,
    hourEnd = 24,
  } = calendarCustomizations;
  const { locale } = useContext(SchedulerContext);
  const originDate = useMemo(() => startOfDay(_originDate), [_originDate]);

  const filterMinsInADay = (
    hourStart: number,
    hourEnd: number,
    schedule: CalendarEvent[],
  ) => {
    const filteredSchedule = filter(
      schedule,
      (calendarEvent: CalendarEvent) => {
        const eventHourStart = moment(calendarEvent.startTime).hour();
        const eventHourEnd = moment(calendarEvent.endTime).hour();
        return eventHourStart >= hourStart && eventHourEnd < hourEnd;
      },
    );
    const filteredMinsInDay = hourEnd * 60 - hourStart * 60;
    const filteredHours = hourEnd - hourStart;

    const numVerticalCells = filteredMinsInDay / dragPrecision; // Total number of cells in a day used in the schedule (1440 / 30)
    const numHorizontalCells = 7 / horizontalPrecision;
    const numVisualVerticalCells = MINS_IN_DAY / visualGridPrecision; // Total number of cells in a day for visual grid (1440 / 30)

    // console.log('numVisualVerticalCells', numVisualVerticalCells);

    const filteredTimeIndexArray = filter(
      times(numVisualVerticalCells),
      verticalCell => {
        const hourSplits = 60 / visualGridPrecision; // How many splits are there in an hour
        const currentHour = verticalCell / hourSplits;

        // console.log('currentHour', currentHour);
        // console.log('hourStart', hourStart);
        // console.log('hourEnd', hourEnd);

        return currentHour >= hourStart && currentHour < hourEnd;
      },
    );
    // console.log('filteredTimeIndexArray', filteredTimeIndexArray);

    return {
      // Filtered Schedule
      filteredSchedule,
      filteredTimeIndexArray,

      // Filtered Time
      // filteredHours,
      // filteredMinsInDay,

      // Cell Values
      numVerticalCells,
      numHorizontalCells,
      numVisualVerticalCells,
    };
  };

  const {
    filteredSchedule,
    filteredTimeIndexArray,
    numVerticalCells,
    numHorizontalCells,
    numVisualVerticalCells,
  } = filterMinsInADay(hourStart, hourEnd, schedule);

  const toMin = useCallback((y: number) => y * dragPrecision, [dragPrecision]);
  const toY = useCallback((mins: number): number => mins / dragPrecision, [
    dragPrecision,
  ]);

  const cellInfoToDateRanges = useMemo(() => {
    return createMapCellInfoToRecurringTimeRange({
      originDate,
      fromY: toMin,
      fromX: toDay,
    });
  }, [toMin, originDate]);

  const cellInfoToSingleDateRange = useCallback(
    (cell: CellInfo): DateRange => {
      const [first, ...rest] = cellInfoToDateRanges(cell);
      // console.log('first', first);
      // console.log('rest', rest);
      // TODO: Figure out if commenting this out has any bad side effects
      // invariant(
      //   rest.length === 0,
      //   `Expected "cellInfoToSingleDateRange" to return a single date range, found ${
      //     rest.length
      //   } additional ranges instead. This is a bug in @remotelock/react-week-scheduler`,
      // );

      return first;
    },
    [cellInfoToDateRanges],
  );

  const dateRangeToCells = useMemo(() => {
    return createMapDateRangeToCells({
      originDate,
      numVerticalCells,
      numHorizontalCells,
      toX,
      toY,
    });
  }, [toY, numVerticalCells, numHorizontalCells, originDate]);

  const root = useRef<HTMLDivElement | null>(null);
  const parent = useRef<HTMLDivElement | null>(null);

  const size = useComponentSize(parent);
  const {
    style: dragBoxStyle,
    box,
    isDragging,
    hasFinishedDragging,
    cancel,
  } = useClickAndDrag(parent, disabled);
  const [pendingCreation, setPendingCreation] = useState<CalendarEvent | null>(
    null,
  );

  const [[totalHeight, totalWidth], setDimensions] = useState([0, 0]);

  useEffect(
    function updateGridDimensionsOnSizeOrCellCountChange() {
      if (!parent.current) {
        setDimensions([0, 0]);
        return;
      }

      setDimensions([parent.current.scrollHeight, parent.current.scrollWidth]);
    },
    [size, numVisualVerticalCells],
  );

  const grid = useMemo<Grid | null>(() => {
    if (totalHeight === null || totalWidth === null) {
      return null;
    }

    return createGrid({
      totalHeight,
      totalWidth,
      numHorizontalCells,
      numVerticalCells,
    });
  }, [totalHeight, totalWidth, numHorizontalCells, numVerticalCells]);

  useEffect(
    function updatePendingCreationOnDragBoxUpdate() {
      if (grid === null || box === null) {
        setPendingCreation(null);
        return;
      }

      const cell = grid.getCellFromRect(box);
      const dateRanges = cellInfoToDateRanges(cell);
      const event: CalendarEvent = {
        startTime: head(dateRanges[0]),
        endTime: head(dateRanges[1]),
        ranges: dateRanges,
      };
      // console.log('event', event);
      setPendingCreation(event);
    },
    [box, grid, cellInfoToDateRanges, toY],
  );

  const [[activeRangeIndex, activeCellIndex], setActive] = useState<
    [number, number] | [null, null]
  >([null, null]);

  useEffect(
    function updateScheduleAfterDraggingFinished() {
      if (disabled) {
        return;
      }
      const eventToBeCreated = head(pendingCreation);

      if (hasFinishedDragging && eventToBeCreated) {
        addEvent({
          startTime: moment(eventToBeCreated[0]).toISOString(),
          endTime: moment(eventToBeCreated[1]).toISOString(),
          ranges: [
            moment(eventToBeCreated[0]).toISOString(),
            moment(eventToBeCreated[1]).toISOString(),
          ],
        });
        setPendingCreation(null);
      }
    },
    [
      hasFinishedDragging,
      disabled,
      addEvent,
      setPendingCreation,
      pendingCreation,
      filteredSchedule,
    ],
  );

  useEffect(
    function clearActiveBlockAfterCreation() {
      if (pendingCreation === null) {
        setActive([null, null]);
      }
    },
    [pendingCreation],
  );

  /**
   * Triggers when event is clicked & Potentially Dragged
   */
  const handleEventChange = useCallback<OnChangeCallback>(
    (eventId, newDateRange, rangeIndex) => {
      console.log('handleEventChange');
      if (disabled) {
        return;
      }

      // if (!filteredSchedule && newDateRange) {
      //   console.log('123', 123);
      //   editEvent([newDateRange]);

      //   return;
      // }

      let newSchedule: DateRange = get(
        [...map(filteredSchedule, 'ranges')],
        rangeIndex,
      ) as DateRange;

      if (!newDateRange) {
        console.log('New Date Range');
        return;
        newSchedule.splice(rangeIndex, 1);
      } else {
        if (
          isDateEqual(newDateRange[0], newSchedule[0]) &&
          isDateEqual(newDateRange[1], newSchedule[1])
        ) {
          return;
        }
        newSchedule = newDateRange;
      }

      editEvent(eventId, {
        startTime: newSchedule[0],
        endTime: newSchedule[1],
      });
    },
    [filteredSchedule, editEvent, disabled],
  );

  useMousetrap(
    'esc',
    function cancelOnEsc() {
      if (pendingCreation) {
        cancel();
      }
    },
    document,
  );

  const getIsActive = useCallback(
    ({ rangeIndex, cellIndex, eventId }) => {
      if (rangeIndex === activeRangeIndex && cellIndex === activeCellIndex) {
        const newSelectedEvent = get(schedule, activeRangeIndex as number);
        if (!selectedEvent || selectedEvent.id != newSelectedEvent.id) {
          selectEvent(newSelectedEvent);
        }
      }

      return (
        (rangeIndex === activeRangeIndex && cellIndex === activeCellIndex) ||
        (selectedEvent && selectedEvent.id === eventId)
      );
    },
    [activeCellIndex, activeRangeIndex, selectedEvent],
  );

  const handleDeleteWrapper = (eventId: string) => {
    return () => {
      deleteEvent(eventId);
    };
  };

  const handleDeleteSelectedEvent = useCallback(() => {
    if (!selectedEvent) {
      return;
    } else {
      deleteEvent(selectedEvent.id as string);
    }
  }, [selectedEvent]);

  useMousetrap(DELETE_KEYS, handleDeleteSelectedEvent, root);

  useEffect(
    function cancelPendingCreationOnSizeChange() {
      cancel();
    },
    [size, cancel],
  );

  const getDateRangeForVisualGrid = useMemo(() => {
    return createMapCellInfoToRecurringTimeRange({
      originDate,
      fromX: toDay,
      fromY: y => y * visualGridPrecision,
    });
  }, [visualGridPrecision, originDate]);

  useEffect(
    function scrollToActiveTimeBlock() {
      if (!document.activeElement) {
        return;
      }

      if (!root.current || !root.current.contains(document.activeElement)) {
        return;
      }

      scrollIntoView(document.activeElement, {
        scrollMode: 'if-needed',
        block: 'nearest',
        inline: 'nearest',
      });
    },
    [filteredSchedule],
  );

  const [wasInitialScrollPerformed, setWasInitialScrollPerformed] = useState(
    false,
  );

  /**
   * Scrolls the page up to first event on the page.
   */
  useEffect(
    function performInitialScroll() {
      if (wasInitialScrollPerformed || !root.current || !grid) {
        return;
      }

      const range = dateRangeToCells(
        getEarliestTimeRange(map(filteredSchedule, 'ranges')) || [
          addHours(originDate, defaultHours[0]),
          addHours(originDate, defaultHours[1]),
        ],
      );
      const rect = grid.getRectFromCell(range[0]);
      const { top, bottom } = rect;

      if (top === 0 && bottom === 0) {
        return;
      }

      // IE, Edge do not support it
      if (!('scrollBy' in root.current)) {
        return;
      }

      root.current.scrollBy(0, top);

      setWasInitialScrollPerformed(true);
    },
    [
      wasInitialScrollPerformed,
      grid,
      filteredSchedule,
      defaultHours,
      originDate,
      dateRangeToCells,
    ],
  );

  const handleBlur: React.FocusEventHandler = useCallback(
    event => {
      console.log('handleBlur');
      if (!event.target.contains(document.activeElement)) {
        setActive([null, null]);
      }
    },
    [setActive],
  );

  const handleCellClick = useCallback(
    (dayIndex: number, timeIndex: number) => (event: React.MouseEvent) => {
      console.log('handleCellClick');
      if (!grid || disabled) {
        return;
      }

      const spanY = toY(clickPrecision);
      const cell = {
        startX: dayIndex,
        startY: timeIndex,
        endX: dayIndex,
        endY: spanY + timeIndex,
        spanY,
        spanX: getSpan(dayIndex, dayIndex),
      };

      const dateRanges = cellInfoToDateRanges(cell);

      setPendingCreation(dateRanges);

      event.stopPropagation();
      event.preventDefault();
    },
    [grid, disabled, toY, clickPrecision, cellInfoToDateRanges],
  );

  return (
    <div
      ref={root}
      style={style}
      onBlur={handleBlur}
      touch-action={isDragging ? 'none' : undefined}
      className={classcat([
        classes.root,
        classes.theme,
        className,
        { [classes['no-scroll']]: isDragging },
      ])}
    >
      <div className={classes['grid-root']}>
        <div
          aria-hidden
          className={classcat([classes.timeline, classes['sticky-left']])}
        >
          <div className={classes.header}>
            <div className={classes['day-column']}>
              <div className={classcat([classes.cell, classes.title])}>T</div>
            </div>
          </div>
          <div className={classes.calendar}>
            <div className={classes['day-column']}>
              <div className={classes['day-hours']}>
                {filteredTimeIndexArray.map(timeIndex => {
                  return (
                    <Cell
                      classes={classes}
                      getDateRangeForVisualGrid={getDateRangeForVisualGrid}
                      key={timeIndex}
                      timeIndex={timeIndex}
                    >
                      {({ start, isHourStart }) => {
                        if (isHourStart) {
                          return (
                            <div className={classes.time}>
                              {format(start, 'h a', { locale })}
                            </div>
                          );
                        }

                        return null;
                      }}
                    </Cell>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div
          className={classcat([
            classes['sticky-top'],
            classes['day-header-row'],
          ])}
        >
          <div
            role="presentation"
            className={classcat([classes.calendar, classes.header])}
          >
            {times(7).map(i => (
              <div
                key={i}
                role="presentation"
                className={classes['day-column']}
              >
                <div className={classcat([classes.cell, classes.title])}>
                  {format(addDays(originDate, i), 'ddd', { locale })}{' '}
                  {format(addDays(originDate, i), 'MM-DD')}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={classes['layer-container']}>
          {isDragging && (
            <div className={classes['drag-box']} style={dragBoxStyle}>
              {hasFinishedDragging && <div className={classes.popup} />}
            </div>
          )}
          {grid && pendingCreation && isDragging && (
            <Schedule
              classes={classes}
              dateRangeToCells={dateRangeToCells}
              cellInfoToDateRange={cellInfoToSingleDateRange}
              className={classes['is-pending-creation']}
              calendarEvents={concat(filteredSchedule, pendingCreation)}
              handleDeleteWrapper={handleDeleteWrapper}
              grid={grid}
              moveAxis="none"
              eventContentComponent={eventContentComponent}
              getIsActive={getIsActive}
            />
          )}
          {grid && !pendingCreation && (
            <Schedule
              classes={classes}
              onActiveChange={setActive}
              dateRangeToCells={dateRangeToCells}
              cellInfoToDateRange={cellInfoToSingleDateRange}
              isResizable
              moveAxis="both"
              isDeletable
              handleDeleteWrapper={handleDeleteWrapper}
              onChange={handleEventChange}
              onClick={onEventClick}
              calendarEvents={filteredSchedule}
              grid={grid}
              eventContentComponent={eventContentComponent}
              eventRootComponent={eventRootComponent}
              getIsActive={getIsActive}
              disabled={disabled}
            />
          )}

          <div ref={parent} role="grid" className={classes.calendar}>
            {times(7).map(dayIndex => {
              return (
                <div
                  role="gridcell"
                  key={dayIndex}
                  className={classes['day-column']}
                >
                  <div className={classes['day-hours']}>
                    {filteredTimeIndexArray.map(timeIndex => {
                      return (
                        <Cell
                          classes={classes}
                          onClick={handleCellClick(
                            dayIndex,
                            timeIndex *
                              (numVerticalCells / numVisualVerticalCells),
                          )}
                          getDateRangeForVisualGrid={getDateRangeForVisualGrid}
                          key={timeIndex}
                          timeIndex={timeIndex}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}, isEqual);
