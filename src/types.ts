export type OnChangeCallback = (
  eventId: string,
  newDateRange: DateRange | undefined,
  rangeIndex: number,
) => void;

export type Coords = { x: number; y: number };

export type ClassNames = typeof import('./styles/styles.module.scss').default;

export type EventRootProps = {
  className?: string;
  classes: ClassNames;
  style?: React.CSSProperties;
  cellIndex: number;
  rangeIndex: number;
  isActive: boolean;
  disabled?: boolean;
  handleDelete(): void;
  calendarEvent: CalendarEvent;
};

export interface CalendarCustomizations {
  dragPrecision?: number;
  visualGridPrecision?: number;
  clickPrecision?: number;
  timeframe?: string; // 0, 1 (defaults to 1 - monday)
  weekStart?: number; // 0, 1 (defaults to 1 - monday)
  hourStart?: number;
  hourEnd?: number;
}

export interface CalendarEvent {
  calendarId?: string;
  id?: string;
  startTime?: Date | string;
  endTime?: Date | string;

  // Extra
  htmlLink?: string;
  summary?: string;
  description?: string;

  // Range
  ranges?: DateRange;
}

export interface CalendarEventCache {
  [key: string]: CalendarEvent;
}

export type CellInfo = {
  spanX: number;
  spanY: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type DateRange = [Date, Date];

export type MapCellInfoToDateRange = (
  options: MapCellInfoToDateRangeOptions,
) => (cellInfo: CellInfo) => DateRange[];

export type MapCellInfoToDateRangeOptions = {
  fromY: (y: number) => number;
  fromX: (x: number) => number;
  originDate: Date;
};

export type Grid = {
  cellHeight: number;
  cellWidth: number;
  totalWidth: number;
  totalHeight: number;
  numVerticalCells: number;
  numHorizontalCells: number;
  getRectFromCell(cell: CellInfo): Rect;
  getCellFromRect(rect: Rect): CellInfo;
};

export type Rect = ClientRect & {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
};
