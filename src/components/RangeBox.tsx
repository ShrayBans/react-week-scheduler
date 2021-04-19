import classcat from 'classcat';
import invariant from 'invariant';
import Resizable, { ResizeCallback } from 're-resizable';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Draggable, { DraggableEventHandler } from 'react-draggable';
import { useMousetrap } from '../hooks/useMousetrap';
import { CalendarEvent, CellInfo } from '../types';
import { DefaultEventRootComponent } from './DefaultEventRootComponent';
import { DefaultEventContent } from './EventContent';
import { ScheduleProps } from './Schedule';

export const RangeBox = React.memo(function RangeBox({
  calendarEvent = {},
  classes,
  grid,
  rangeIndex,
  cellIndex,
  cellArray,
  cell,
  className,
  onChange,
  handleDelete,
  setIsEdit,
  editEvent,
  cellInfoToDateRange,
  isResizable,
  isEdit,
  moveAxis,
  onActiveChange,
  onClick,
  getIsActive,
  selectedEventId,
  eventContentComponent: EventContentComponent = DefaultEventContent,
  eventRootComponent: EventRootComponent = DefaultEventRootComponent,
  disabled,
}: ScheduleProps & {
  calendarEvent?: CalendarEvent;
  cellIndex: number;
  cellArray: CellInfo[];
  className?: string;
  rangeIndex: number;
  cell: CellInfo;
}) {
  const ref = useRef(null);
  const [modifiedCell, setModifiedCell] = useState(cell);
  const [isResizeOrDrag, setIsResizeOrDrag] = useState(false);
  const originalRect = useMemo(() => grid.getRectFromCell(cell), [cell, grid]);
  const rect = useMemo(() => grid.getRectFromCell(modifiedCell), [
    modifiedCell,
    grid,
  ]);

  useEffect(() => {
    setModifiedCell(cell);
  }, [cell]);

  // console.log('modifiedCell', modifiedCell);
  const modifiedDateRange = useMemo(() => cellInfoToDateRange(modifiedCell), [
    cellInfoToDateRange,
    modifiedCell,
  ]);

  const { top, left, width, height } = rect;

  const isStart = cellIndex === 0;
  const isEnd = cellIndex === cellArray.length - 1;

  const handleResizeOrDragEnd = useCallback(() => {
    if (!onChange || disabled) {
      return;
    }
    setIsResizeOrDrag(false);

    onChange(
      calendarEvent.id as string,
      cellInfoToDateRange(modifiedCell),
      rangeIndex,
    );
  }, [modifiedCell, rangeIndex, disabled, cellInfoToDateRange, onChange]);

  const isActive = useMemo(
    () =>
      getIsActive({
        cellIndex,
        rangeIndex,
        eventId: 'TODO: REPLACE WITH ACTUAL EVENTID',
      }),
    [cellIndex, rangeIndex, getIsActive],
  );

  // useMousetrap(
  //   'up',
  //   () => {
  //     if (!onChange || disabled || !isActive) {
  //       return;
  //     }

  //     if (moveAxis === 'none' || moveAxis === 'x') {
  //       return;
  //     }

  //     if (modifiedCell.startY === 0) {
  //       return;
  //     }

  //     const newCell = {
  //       ...modifiedCell,
  //       startY: modifiedCell.startY - 1,
  //       endY: modifiedCell.endY - 1,
  //     };

  //     onChange(
  //       calendarEvent.id as string,
  //       cellInfoToDateRange(newCell),
  //       rangeIndex,
  //     );
  //   },
  //   ref,
  // );

  // useMousetrap(
  //   'shift+up',
  //   () => {
  //     if (!onChange || !isResizable || disabled || !isActive) {
  //       return;
  //     }

  //     if (
  //       modifiedCell.endY === modifiedCell.startY ||
  //       modifiedCell.spanY === 0
  //     ) {
  //       return;
  //     }

  //     const newCell = {
  //       ...modifiedCell,
  //       endY: modifiedCell.endY - 1,
  //       spanY: modifiedCell.spanY - 1,
  //     };

  //     onChange(
  //       calendarEvent.id as string,
  //       cellInfoToDateRange(newCell),
  //       rangeIndex,
  //     );
  //   },
  //   ref,
  // );

  // useMousetrap(
  //   'down',
  //   () => {
  //     if (!onChange || disabled || !isActive) {
  //       return;
  //     }

  //     if (moveAxis === 'none' || moveAxis === 'x') {
  //       return;
  //     }

  //     if (Math.round(modifiedCell.endY) >= grid.numVerticalCells - 1) {
  //       return;
  //     }

  //     const newCell = {
  //       ...modifiedCell,
  //       startY: modifiedCell.startY + 1,
  //       endY: modifiedCell.endY + 1,
  //     };

  //     onChange(
  //       calendarEvent.id as string,
  //       cellInfoToDateRange(newCell),
  //       rangeIndex,
  //     );
  //   },
  //   ref,
  // );

  // useMousetrap(
  //   'shift+down',
  //   () => {
  //     if (!onChange || !isResizable || disabled || !isActive) {
  //       return;
  //     }

  //     if (moveAxis === 'none' || moveAxis === 'x') {
  //       return;
  //     }

  //     if (Math.round(modifiedCell.endY) >= grid.numVerticalCells - 1) {
  //       return;
  //     }

  //     const newCell = {
  //       ...modifiedCell,
  //       spanY: modifiedCell.spanY + 1,
  //       endY: modifiedCell.endY + 1,
  //     };

  //     onChange(
  //       calendarEvent.id as string,
  //       cellInfoToDateRange(newCell),
  //       rangeIndex,
  //     );
  //   },
  //   ref,
  // );

  /**
   * Handles Dragging of an actual event to a different time slot
   */
  const handleDrag: DraggableEventHandler = useCallback(
    (event, { y, x }) => {
      if (moveAxis === 'none' || disabled) {
        return;
      }
      setIsResizeOrDrag(true);

      event.preventDefault();
      event.stopPropagation();

      const newRect = {
        ...rect,
      };

      if (moveAxis === 'both' || moveAxis === 'y') {
        const startOrEnd1 = y;
        const startOrEnd2 = startOrEnd1 + rect.height;
        const newTop = Math.min(startOrEnd1, startOrEnd2);
        const newBottom = newTop + rect.height;
        newRect.bottom = newBottom;
        newRect.top = newTop;
      }

      if (moveAxis === 'both' || moveAxis === 'x') {
        const startOrEnd1 = x;
        const startOrEnd2 = startOrEnd1 + rect.width;
        const newLeft = Math.min(startOrEnd1, startOrEnd2);
        const newRight = newLeft + rect.width;
        newRect.right = newRight;
        newRect.left = newLeft;
      }

      const { startY, startX } = grid.getCellFromRect(newRect);

      const newCell = {
        ...cell,
        startX: moveAxis === 'y' ? cell.startX : startX,
        endX: moveAxis === 'x' ? startX + cell.spanX - 1 : cell.endX,
        startY: moveAxis === 'x' ? cell.startY : startY,
        endY: moveAxis === 'y' ? startY + cell.spanY - 1 : cell.endY,
      };

      invariant(
        newCell.spanY === cell.spanY && newCell.spanX === cell.spanX,
        `Expected the dragged time cell to have the same dimensions`,
      );

      setModifiedCell(newCell);
    },
    [grid, rect, moveAxis, disabled, cell, setModifiedCell],
  );

  /**
   *
   */
  const handleResize: ResizeCallback = useCallback(
    (event, direction, _ref, delta) => {
      if (!isResizable || disabled) {
        return;
      }
      setIsResizeOrDrag(true);

      event.preventDefault();
      event.stopPropagation();

      if (delta.height === 0) {
        return;
      }

      const newSize = {
        height: delta.height + rect.height,
        width: delta.width + rect.width + 20,
      };

      const newRect = {
        ...originalRect,
        ...newSize,
      };

      if (direction.includes('top')) {
        newRect.top -= delta.height;
      } else if (direction.includes('bottom')) {
        newRect.bottom += delta.height;
      }

      const { spanY, startY, endY } = grid.getCellFromRect(newRect);
      const newCell = {
        ...cell,
        spanY,
        startY,
        endY,
      };

      setModifiedCell(newCell);
    },
    [grid, rect, disabled, isResizable, setModifiedCell, cell, originalRect],
  );

  const handleOnFocus = useCallback(() => {
    if (!onActiveChange || disabled) {
      return;
    }

    onActiveChange([rangeIndex, cellIndex]);
  }, [onActiveChange, disabled, rangeIndex, cellIndex]);

  const handleOnClick = useCallback(() => {
    if (!onClick || disabled || !isActive) {
      return;
    }

    onClick(calendarEvent);
  }, [onClick, rangeIndex, disabled, isActive, cellIndex]);

  useMousetrap('enter', handleOnClick, ref);

  const cancelClasses = useMemo(
    () =>
      classes.handle
        ? classes.handle
            .split(' ')
            .map(className => `.${className}`)
            .join(', ')
        : undefined,
    [classes.handle],
  );
  // console.log('modifiedDateRange', modifiedDateRange);

  return (
    <Draggable
      axis={moveAxis}
      bounds={{
        top: 0,
        bottom: grid.totalHeight - height,
        left: 0,
        right: grid.totalWidth,
      }}
      position={{ x: left, y: top }}
      onDrag={handleDrag}
      onStop={handleResizeOrDragEnd}
      cancel={cancelClasses}
      disabled={disabled}
    >
      <EventRootComponent
        role="button"
        disabled={disabled}
        onFocus={handleOnFocus}
        onClick={handleOnClick}
        handleDelete={handleDelete}
        setIsEdit={setIsEdit}
        handleEdit={editEvent}
        cellIndex={cellIndex}
        rangeIndex={rangeIndex}
        isActive={isActive || calendarEvent.id == selectedEventId}
        isEdit={isEdit}
        classes={classes}
        calendarEvent={calendarEvent}
        className={classcat([
          classes.event,
          classes['range-boxes'],
          className,
          {
            [classes['is-draggable']]: !disabled && moveAxis !== 'none',
            [classes['is-disabled']]: disabled,
          },
        ])}
        ref={ref}
        style={{ width: width - 20, height }}
      >
        <Resizable
          size={{ ...originalRect, width: originalRect.width - 20 }}
          key={`${rangeIndex}.${cellIndex}.${cellArray.length}.${
            originalRect.top
          }.${originalRect.left}`}
          onResize={handleResize}
          onResizeStop={handleResizeOrDragEnd}
          handleWrapperClass={classes['handle-wrapper']}
          enable={
            isResizable && !disabled
              ? {
                  top: true,
                  bottom: true,
                }
              : {}
          }
          handleClasses={{
            bottom: classcat([classes.handle, classes.bottom]),
            bottomLeft: classes.handle,
            bottomRight: classes.handle,
            left: classes.handle,
            right: classes.handle,
            top: classcat([classes.handle, classes.top]),
            topLeft: classes.handle,
            topRight: classes.handle,
          }}
        >
          <EventContentComponent
            width={width}
            height={height}
            classes={classes}
            calendarEvent={calendarEvent}
            isStart={isStart}
            isEnd={isResizeOrDrag}
          />
        </Resizable>
      </EventRootComponent>
    </Draggable>
  );
});
