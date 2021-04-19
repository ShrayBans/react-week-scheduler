import Tippy from '@tippy.js/react';
import classcat from 'classcat';
import format from 'date-fns/format';
import isDateEqual from 'date-fns/is_equal';
import ar from 'date-fns/locale/ar';
import de from 'date-fns/locale/de';
import en from 'date-fns/locale/en';
import ja from 'date-fns/locale/ja';
import setDay from 'date-fns/set_day';
import startOfWeek from 'date-fns/start_of_week';
// @ts-ignore
import humanizeDuration from 'humanize-duration';
import {
  capitalize,
  filter,
  head,
  keyBy,
  map,
  size,
  times,
  values,
} from 'lodash';
import mapValues from 'lodash/mapValues';
import moment from 'moment-timezone';
import 'pepjs';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import CustomProperties from 'react-custom-properties';
import ReactDOM from 'react-dom';
import 'resize-observer-polyfill/dist/ResizeObserver.global';
import useUndo from 'use-undo';
import { DefaultEventRootComponent } from '../src/components/DefaultEventRootComponent';
import { TimeGridScheduler } from '../src/components/TimeGridScheduler';
import { SchedulerContext } from '../src/context';
import { useMousetrap } from '../src/hooks/useMousetrap';
import { classes as defaultClasses } from '../src/styles';
import {
  CalendarCustomizations,
  CalendarEvent,
  CalendarEventCache,
  EventRootProps,
} from '../src/types';
import { default as DeleteIcon } from './assets/outline-delete-24px.svg';
import { Key } from './components/Key/Key';
import demoClasses from './index.module.scss';
import {
  addGcalEvents,
  deleteGcalEvents,
  editGcalEvent,
  fetchGcalEvents,
} from './util/api';
import { transformGcalEvents } from './util/dateHelpers';

const locales = {
  ja,
  en,
  de,
  ar,
};

const classes = mapValues(
  defaultClasses,
  (value, key: keyof typeof defaultClasses) =>
    classcat([value, demoClasses[key]]),
);

const EventRoot = React.forwardRef<any, EventRootProps>(function EventRoot(
  {
    handleDelete,
    isSelected = false,
    isEdit = false,
    handleEdit,
    disabled,
    calendarEvent,
    setIsEdit,
    ...props
  },
  ref,
) {
  const [summary, setSummary] = useState(calendarEvent.summary);
  const [description, setDescription] = useState(calendarEvent.description);

  return (
    <Tippy
      arrow
      interactive
      placement={'right-start'}
      isEnabled={!disabled}
      hideOnClick={false}
      className={demoClasses.tooltip}
      isVisible={props.isActive}
      content={
        <>
          <div>
            <strong>Event Name</strong>:{' '}
            {isEdit ? (
              <input
                id="summary"
                name="summary"
                type="text"
                className={demoClasses.backgroundInput}
                value={summary}
                onChange={({ target: { value } }) => {
                  setSummary(value);
                }}
              />
            ) : (
              summary
            )}
          </div>
          <div>
            <strong>Description</strong>:{' '}
            {isEdit ? (
              <textarea
                id="description"
                name="description"
                className={demoClasses.backgroundInput}
                value={description}
                onChange={({ target: { value } }) => {
                  setDescription(value);
                }}
              />
            ) : (
              description
            )}
          </div>
          <button
            disabled={disabled}
            onClick={handleDelete}
            className={demoClasses.deleteButton}
          >
            <DeleteIcon className={demoClasses.icon} />
            Delete
          </button>
          <button
            onClick={() => {
              setIsEdit(!isEdit);
            }}
            className={demoClasses.editButton}
          >
            Edit
          </button>
          <button
            disabled={!isEdit}
            onClick={() => {
              handleEdit(calendarEvent.id, {
                summary,
                description,
              });
            }}
            className={demoClasses.saveButton}
          >
            <DeleteIcon className={demoClasses.icon} />
            {/* <SaveIcon className={demoClasses.icon} /> */}
            Save
          </button>
        </>
      }
    >
      <DefaultEventRootComponent
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        disabled={disabled}
        calendarEvent={calendarEvent}
        {...props}
        ref={ref}
      />
    </Tippy>
  );
});

function App() {
  const [timeframe, setTimeframe] = useState('week');
  const [weekStart, setWeekStart] = useState(1); // monday
  const [hourStart, setHourStart] = useState(0);
  const [hourEnd, setHourEnd] = useState(24);
  const [refreshIntervalMinutes, setRefreshIntervalMinutes] = useState(5);

  const [allCachedEvents, setCachedEvents] = useState<CalendarEventCache>({});
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>(null);
  console.log('selectedEvent', selectedEvent);
  const [dragPrecision, setDragPrecision] = useState(5);
  const [visualGridPrecision, setVisualGridPrecision] = useState(30);

  const [clickPrecision, setClickPrecision] = useState(visualGridPrecision);
  const [cellHeight, setCellHeight] = useState(45);
  const [cellWidth, setCellWidth] = useState(250);
  const [disabled, setDisabled] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [locale, setLocale] = useState('en');

  const calendarCustomizations: CalendarCustomizations = {
    timeframe,
    weekStart,
    hourStart,
    hourEnd,
    dragPrecision,
    visualGridPrecision,
    clickPrecision,
  };

  const originDate = useMemo(
    () =>
      startOfWeek(moment.utc().toDate(), {
        weekStartsOn: weekStart,
      }),
    [weekStart],
  );

  const refreshCachedEvents = async () => {
    // Fetches Events
    const fetchedEvents = await fetchGcalEvents(timeframe, weekStart);
    const transformedEvents = await transformGcalEvents(
      fetchedEvents.events,
      weekStart,
      originDate,
    );

    // Merges all cached events (removes deleted events and adds new events)
    const mergedEvents = {
      ...allCachedEvents,
      ...keyBy(transformedEvents, 'id'),
    };

    setCachedEvents(mergedEvents);
    setCurrentEvents(values(mergedEvents));
  };

  // TODO: Add back in once caching is fixed
  // useInterval(() => {
  //   const init = async () => {
  //     // const fetchedCalendars = await fetchAllUserCalendars();
  //     await refreshCachedEvents();
  //   };

  //   init();
  // }, 1000 * 60 * refreshIntervalMinutes);

  /**
   * Fetching Events
   */
  useEffect(() => {
    const init = async () => {
      // const fetchedCalendars = await fetchAllUserCalendars();
      await refreshCachedEvents();
    };

    init();
  }, []);

  /**
   * Setting Schedule from Fetched Events
   */
  const [
    scheduleState,
    {
      set: setSchedule,
      reset: resetSchedule,
      undo: undoSchedule,
      redo: redoSchedule,
      canUndo: canUndoSchedule,
      canRedo: canRedoSchedule,
    },
  ] = useUndo<CalendarEvent[]>(currentEvents);

  /**
   * API Methods
   */
  const addCalendarEvent = async (newEvent, isDuplicate = false) => {
    if (disabled) return;
    if (selectedEvent && !isDuplicate) return;
    const newEventPayload = {
      ...newEvent,
      ranges: [newEvent.startTime, newEvent.endTime],
    };
    setDisabled(true);

    const savedSchedule = scheduleState.present;
    // Try to add the schedule locally
    // setSchedule([...scheduleState.present, newEventPayload]);

    // API Call to Add Gcal Event
    const { event, isCreated } = await addGcalEvents(newEventPayload);
    const transformedEvents = transformGcalEvents(
      [event],
      weekStart,
      originDate,
    );
    const mergedEvents = {
      ...allCachedEvents,
      [event.id]: head(transformedEvents),
    };
    setCachedEvents(mergedEvents);

    // If API call fails, then revert
    if (!isCreated) {
      undoSchedule();
    } else {
      setSchedule([...savedSchedule, ...transformedEvents]);
    }
    setDisabled(false);

    return event;
  };

  const duplicateCalendarEvent = async () => {
    if (!selectedEvent) return;
    let origStartTime = selectedEvent.startTime;
    let origEndTime = selectedEvent.endTime;
    const durationMin = moment(origEndTime).diff(
      moment(origStartTime),
      'minutes',
    );

    let hasDuplicate = true,
      newEventPayload;
    while (hasDuplicate) {
      newEventPayload = {
        summary: selectedEvent.summary,
        startTime: origEndTime,
        endTime: moment(origEndTime)
          .add(Number(durationMin), 'minutes')
          .toDate(),
        description: selectedEvent.description,
      };

      const matchedEvent = filter(currentEvents, currEvent => {
        return (
          newEventPayload.summary === currEvent.summary &&
          isDateEqual(newEventPayload.startTime, currEvent.startTime) &&
          isDateEqual(newEventPayload.endTime, currEvent.endTime)
        );
      });
      if (size(matchedEvent) == 0) {
        hasDuplicate = false;
      } else {
        origEndTime = newEventPayload.endTime;
      }
    }

    const addedEvent = await addCalendarEvent(newEventPayload, true);
  };
  const deleteCalendarEvent = async eventId => {
    const usedEventId = eventId || selectedEvent.id;
    console.log('disabled', disabled);
    if (disabled) return;
    if (!usedEventId) return;
    setDisabled(true);
    // Try to delete the schedule locally
    setSchedule(
      filter(scheduleState.present, event => {
        return event.id !== usedEventId;
      }),
    );

    // API Call to Delete Gcal Event
    const { event, isDeleted } = await deleteGcalEvents(usedEventId);

    // If API call fails, then revert
    if (!isDeleted) undoSchedule();

    setDisabled(false);
  };

  /**
   * Selects an event
   * @param newEvent
   */
  const selectEvent = (newEvent: CalendarEvent) => {
    console.log('selectEvent', newEvent);
    setSelectedEvent(newEvent);
  };

  const editCalendarEvent = async (
    eventId: string,
    modifiedEvent: Partial<CalendarEvent>,
  ) => {
    if (disabled) return;
    if (!eventId) return;
    setDisabled(true);

    let editedEvent;
    const newSchedule = map(scheduleState.present, currEvent => {
      if (currEvent.id == eventId) {
        editedEvent = { ...currEvent, ...modifiedEvent };
        return editedEvent;
      }
      return currEvent;
    });
    console.log('newSchedule', newSchedule);
    setSchedule(newSchedule);

    const { event, isEdited } = await editGcalEvent({
      id: eventId,
      ...editedEvent,
    });

    if (!isEdited) undoSchedule();
    setDisabled(false);
    selectEvent(null);
  };
  console.log('scheduleState', scheduleState.present);

  /**
   * Keyboard Shortcuts - TODO put into a hook
   */
  useMousetrap(
    ['mod+e'],
    () => {
      setIsEdit(!isEdit);
    },
    document,
  );
  useMousetrap(
    ['mod+z'],
    () => {
      if (!canUndoSchedule) {
        return;
      }

      undoSchedule();
    },
    document,
  );
  useMousetrap(
    'mod+shift+z',
    () => {
      if (!canRedoSchedule) {
        return;
      }

      redoSchedule();
    },
    document,
  );
  useMousetrap(
    'mod+v',
    () => {
      if (!selectedEvent) return;

      duplicateCalendarEvent();
    },
    document,
  );

  const [initLoad, setInitLoad] = useState(false);

  useEffect(() => {
    setCurrentEvents(scheduleState.present);
  }, [setCurrentEvents, scheduleState.present]);

  useEffect(() => {
    if (currentEvents.length && !initLoad) {
      console.log('reset');
      setSchedule(currentEvents);
      resetSchedule(currentEvents);
      setInitLoad(true);
    }
  }, [currentEvents, setSchedule, resetSchedule]);

  return (
    <>
      <div className={demoClasses['buttons-wrapper']}>
        <button
          type="button"
          disabled={!canUndoSchedule}
          onClick={undoSchedule}
        >
          ⟲ Undo
        </button>
        <button
          type="button"
          disabled={!canRedoSchedule}
          onClick={redoSchedule}
        >
          Redo ⟳
        </button>
        <label htmlFor="drag_precision">
          Drag Precision:
          <select
            name="drag_precision"
            id="drag_precision"
            value={dragPrecision}
            onChange={({ target: { value } }) =>
              setDragPrecision(Number(value))
            }
          >
            {[5, 10, 15, 30, 60].map(value => (
              <option key={value} value={value}>
                {humanizeDuration(value * 60 * 1000)}
              </option>
            ))}
          </select>
        </label>
        {/* <label htmlFor="disabled">
          <input
            id="disabled"
            type="checkbox"
            name="disabled"
            checked={disabled}
            onChange={e => setDisabled(Boolean(e.target.checked))}
          />
          Disabled
        </label> */}
        <label htmlFor="timeframe">
          Timeframe:
          <select
            name="timeframe"
            id="timeframe"
            value={timeframe}
            onChange={({ target: { value } }) => setTimeframe(value)}
          >
            {['month', 'week', 'day', 'hour'].map(value => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="hour_start">
          Hour Start:
          <select
            name="hour_start"
            id="hour_start"
            value={hourStart}
            onChange={({ target: { value } }) => {
              if (hourEnd > Number(value)) {
                setHourStart(Number(value));
              } else {
                setHourStart(Number(hourEnd));
              }
            }}
          >
            {times(24).map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="hour_end">
          Hour End:
          <select
            name="hour_end"
            id="hour_end"
            value={hourEnd}
            onChange={({ target: { value } }) => {
              if (Number(value) > hourStart) {
                setHourEnd(Number(value));
              } else {
                setHourEnd(Number(hourEnd));
              }
            }}
          >
            {times(25).map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="start_of_week">
          Start of week:
          <select
            name="start_of_week"
            id="start_of_week"
            value={weekStart}
            onChange={({ target: { value } }) => setWeekStart(Number(value))}
          >
            {[0, 1, 2, 3, 4, 5, 6].map(value => (
              <option key={value} value={value}>
                {format(setDay(new Date(), value), 'ddd', {
                  locale: locales[locale],
                })}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="visual_grid_precision">
          Grid increments:
          <select
            name="visual_grid_precision"
            id="visual_grid_precision"
            value={visualGridPrecision}
            onChange={({ target: { value } }) =>
              setVisualGridPrecision(Number(value))
            }
          >
            {[15, 30, 60].map(value => (
              <option key={value} value={value}>
                {humanizeDuration(value * 60 * 1000)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="click_precision">
          Min click precision:
          <select
            name="click_precision"
            id="click_precision"
            value={clickPrecision}
            onChange={({ target: { value } }) =>
              setClickPrecision(Number(value))
            }
          >
            {[15, 30, 60].map(value => (
              <option key={value} value={value}>
                {humanizeDuration(value * 60 * 1000)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="locale">
          Locale:
          <select
            name="locale"
            id="locale"
            value={locale}
            onChange={({ target: { value } }) => {
              setLocale(value);
            }}
          >
            {['en', 'ar', 'ja', 'de'].map(value => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="cell_height">
          Cell height:
          <input
            id="cell_height"
            name="cell_height"
            type="range"
            max={100}
            step={10}
            min={30}
            value={cellHeight}
            onChange={({ target: { value } }) => setCellHeight(Number(value))}
          />
        </label>
        <label htmlFor="cell_width">
          Preferred cell width:
          <input
            id="cell_width"
            name="cell_width"
            type="range"
            max={300}
            step={25}
            min={150}
            value={cellWidth}
            onChange={({ target: { value } }) => setCellWidth(Number(value))}
          />
        </label>
        <div>
          Tip: use <Key>Delete</Key> key to remove time blocks. <Key>↑</Key> and{' '}
          <Key>↓</Key> to move.
        </div>
      </div>
      <CustomProperties
        global={false}
        properties={{
          '--cell-height': `${cellHeight}px`,
          '--cell-width': `${cellWidth}px`,
        }}
      >
        <Fragment key={`${cellHeight},${cellWidth}`}>
          <SchedulerContext.Provider value={{ locale: locales[locale] }}>
            <TimeGridScheduler
              key={originDate.toString()}
              classes={classes}
              originDate={originDate}
              allCachedEvents={allCachedEvents}
              schedule={scheduleState.present}
              calendarCustomizations={calendarCustomizations}
              addEvent={addCalendarEvent}
              setIsEdit={setIsEdit}
              editEvent={editCalendarEvent}
              deleteEvent={deleteCalendarEvent}
              selectEvent={selectEvent}
              onEventClick={e => {
                selectEvent(e);
              }}
              isEdit={isEdit}
              selectedEvent={selectedEvent}
              eventRootComponent={EventRoot}
              // disabled={disabled}
            />
          </SchedulerContext.Provider>
        </Fragment>
      </CustomProperties>
    </>
  );
}

const rootElement = document.getElementById('root');

ReactDOM.render(<App />, rootElement);
