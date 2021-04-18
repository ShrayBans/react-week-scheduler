import React from 'react';
import {
  CalendarEvent,
  CellInfo,
  ClassNames,
  DateRange,
  Grid,
  OnChangeCallback,
} from '../types';
import { RangeBox } from './RangeBox';

export type ScheduleProps = {
  classes: ClassNames;
  grid: Grid;
  onChange?: OnChangeCallback;
  isResizable?: boolean;
  isDeletable?: boolean;
  moveAxis: 'none' | 'both' | 'x' | 'y';
  cellInfoToDateRange(cell: CellInfo): DateRange;
  onActiveChange?(index: [number, number] | [null, null]): void;
  onClick?(index: [number, number] | [null, null]): void;
  handleDelete?(eventId: string): void;
  getIsActive(indexes: {
    cellIndex: number;
    rangeIndex: number;
    eventId: string;
  }): boolean;
  eventContentComponent?: any;
  eventRootComponent?: any;
  disabled?: boolean;
};

export const Schedule = React.memo(function Schedule({
  classes,
  calendarEvents,
  grid,
  className,
  onChange,
  isResizable,
  isDeletable,
  moveAxis,
  cellInfoToDateRange,
  dateRangeToCells,
  onActiveChange,
  handleDeleteWrapper,
  eventContentComponent,
  eventRootComponent,
  onClick,
  getIsActive,
  disabled,
}: {
  dateRangeToCells(range: DateRange): CellInfo[];
  calendarEvents: CalendarEvent[];
  className?: string;
  handleDeleteWrapper?: any;
  classes: ClassNames;
} & ScheduleProps) {
  return (
    <div className={classes['range-boxes']}>
      {calendarEvents.map((calendarEvent, rangeIndex) => {
        return (
          <span key={rangeIndex}>
            {dateRangeToCells(calendarEvent.ranges as DateRange).map(
              (cell, cellIndex, cellArray) => {
                return (
                  <RangeBox
                    calendarEvent={calendarEvent}
                    classes={classes}
                    onActiveChange={onActiveChange}
                    key={`${rangeIndex}.${calendarEvents.length}.${cellIndex}.${
                      cellArray.length
                    }`}
                    isResizable={isResizable}
                    moveAxis={moveAxis}
                    isDeletable={isDeletable}
                    cellInfoToDateRange={cellInfoToDateRange}
                    cellArray={cellArray}
                    cellIndex={cellIndex}
                    rangeIndex={rangeIndex}
                    className={className}
                    onChange={onChange}
                    handleDelete={handleDeleteWrapper(calendarEvent.id)}
                    onClick={onClick}
                    grid={grid}
                    cell={cell}
                    getIsActive={getIsActive}
                    eventContentComponent={eventContentComponent}
                    eventRootComponent={eventRootComponent}
                    disabled={disabled}
                  />
                );
              },
            )}
          </span>
        );
      })}
    </div>
  );
});
