"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/utils/api/calendar";
import type { AdminBookingIn, BookingPatch, CalendarUpdate, ConnectionCreate, ConnectionUpdate } from "@/utils/api/models";
import { qk } from "./keys";
import { useApiMutation } from "./mutation";

export const useCalendars = () => useQuery({ queryKey: qk.calendars, queryFn: api.listCalendars });
export const useCreateCalendar = () => useApiMutation(api.createCalendar, { invalidate: [qk.calendars] });
export const useUpdateCalendar = () =>
  useApiMutation((v: { id: string; body: CalendarUpdate }) => api.updateCalendar(v.id, v.body), { invalidate: [qk.calendars] });
export const useDeleteCalendar = () => useApiMutation(api.deleteCalendar, { invalidate: [qk.calendars] });

/** Bookings change contacts (stage, call time) and the dashboard too. */
const BOOKING_KEYS = [qk.bookings, qk.contacts, qk.salesBoard, ["dashboard"], qk.activity];
export const useBookings = (range: { start?: string; end?: string } = {}) =>
  useQuery({ queryKey: [...qk.bookings, range], queryFn: () => api.listBookings(range) });
export const useCreateBooking = () => useApiMutation((v: AdminBookingIn) => api.createBooking(v), { invalidate: BOOKING_KEYS });
export const useUpdateBooking = () =>
  useApiMutation((v: { id: string; body: BookingPatch }) => api.updateBooking(v.id, v.body), { invalidate: BOOKING_KEYS });
export const useCancelBooking = () => useApiMutation(api.cancelBooking, { invalidate: BOOKING_KEYS });

export const useCalendarConnections = () => useQuery({ queryKey: qk.calendarConnections, queryFn: api.listCalendarConnections });
export const useCreateCalendarConnection = () =>
  useApiMutation((v: ConnectionCreate) => api.createCalendarConnection(v), { invalidate: [qk.calendarConnections] });
export const useUpdateCalendarConnection = () =>
  useApiMutation((v: { id: string; body: ConnectionUpdate }) => api.updateCalendarConnection(v.id, v.body), {
    invalidate: [qk.calendarConnections],
  });
export const useDeleteCalendarConnection = () => useApiMutation(api.deleteCalendarConnection, { invalidate: [qk.calendarConnections] });

export const usePublicCalendar = (slug: string) =>
  useQuery({ queryKey: qk.publicCalendar(slug), queryFn: () => api.getPublicCalendar(slug), enabled: !!slug, retry: false });
export const usePublicSlots = (slug: string, day: string) =>
  useQuery({ queryKey: qk.publicSlots(slug, day), queryFn: () => api.getPublicSlots(slug, day), enabled: !!slug && !!day });
