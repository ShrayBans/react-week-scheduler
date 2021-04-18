import Axios from 'axios';
import { get } from 'lodash';
import qs from 'qs';
import { CalendarEvent } from '../../src/types';

const getApiHost = () => {
  return 'http://localhost:2345';
};

export const formatQueryParams = (
  queryParams,
  queryStartChar = '?',
  options = {},
) => {
  const formatted = qs.stringify(queryParams, {
    arrayFormat: 'repeat',
    skipNulls: true,
    ...options,
  });

  return formatted ? `${queryStartChar}${formatted}` : '';
};

export const fetchAllUserCalendars = async () => {
  let output = { events: [] };
  try {
    const { data: response } = await Axios.get(
      `${getApiHost()}/api/v1/calendar/`,
    );

    output = get(response, ['data', 'items']);
  } catch (e) {
    console.log('e', e);
  }
  return output;
};

export const fetchGcalEvents = async (timeframe = 'week', weekStart = 1) => {
  const queryParams = {
    timeframe: timeframe,
    weekStart: weekStart,
  };
  let output = { events: [] };
  try {
    const { data: response } = await Axios.get(
      `${getApiHost()}/api/v1/calendar/events${formatQueryParams(queryParams)}`,
    );

    output = response;
  } catch (e) {
    console.log('e', e);
  }
  return output;
};

export const addGcalEvents = async (eventBody: CalendarEvent) => {
  let event,
    isCreated = false;
  try {
    const { data: response } = await Axios.post(
      `${getApiHost()}/api/v1/calendar/events`,
      {
        startTime: eventBody.startTime,
        endTime: eventBody.endTime,
        summary: eventBody.summary,
      },
    );

    isCreated = true;
    event = response.data;
  } catch (e) {
    console.log('e', e);
  }
  return { event, isCreated };
};

export const deleteGcalEvents = async (gcalEventId: string) => {
  let event,
    isDeleted = false;
  try {
    const { data: response } = await Axios.delete(
      `${getApiHost()}/api/v1/calendar/events/${gcalEventId}`,
    );

    isDeleted = true;
    event = response;
  } catch (e) {
    console.log('e', e);
  }
  return { event, isDeleted };
};

export const editGcalEvent = async (eventBody: CalendarEvent) => {
  let event,
    isEdited = false;
  try {
    const { data: response } = await Axios.patch(
      `${getApiHost()}/api/v1/calendar/events/${eventBody.id}`,
      {
        startTime: eventBody.startTime,
        endTime: eventBody.endTime,
        summary: eventBody.summary,
        description: eventBody.description,
      },
    );

    isEdited = true;
    event = response;
  } catch (e) {
    console.log('e', e);
  }
  return { event, isEdited };
};
