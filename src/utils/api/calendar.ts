import { del, get, patch, post } from "./client";
import type {
  AdminBookingIn,
  BookingOut,
  BookingPatch,
  BookingRequest,
  CalendarCreate,
  CalendarOut,
  CalendarUpdate,
  ConfirmationPreviewIn,
  ConfirmationPreviewOut,
  ConnectionCreate,
  ConnectionOut,
  ConnectionUpdate,
  GoogleStartOut,
  PublicBookingOut,
  PublicCalendarOut,
  SlotsOut,
  ZoomStartOut,
} from "./models";

// ------------------------------------------------------------------ Booking calendars
export const listCalendars = () => get<CalendarOut[]>("/admin/calendars");
export const getCalendar = (id: string) => get<CalendarOut>(`/admin/calendars/${id}`);
/** 409 `duplicate_slug` when the link is taken. */
export const createCalendar = (body: CalendarCreate) => post<CalendarOut>("/admin/calendars", body);
export const updateCalendar = (id: string, body: CalendarUpdate) => patch<CalendarOut>(`/admin/calendars/${id}`, body);
export const deleteCalendar = (id: string) => del(`/admin/calendars/${id}`);
/** The guest's confirmation email for a sample booking, with unsaved subject/message edits. */
export const previewConfirmation = (id: string, body: ConfirmationPreviewIn) =>
  post<ConfirmationPreviewOut>(`/admin/calendars/${id}/confirmation-preview`, body);

// ------------------------------------------------------------------ Bookings
export const listBookings = (range: { start?: string; end?: string } = {}) => get<BookingOut[]>("/admin/bookings", range);
export const getBooking = (id: string) => get<BookingOut>(`/admin/bookings/${id}`);
export const createBooking = (body: AdminBookingIn) => post<BookingOut>("/admin/bookings", body);
export const updateBooking = (id: string, body: BookingPatch) => patch<BookingOut>(`/admin/bookings/${id}`, body);
export const cancelBooking = (id: string) => post<void>(`/admin/bookings/${id}/cancel`);

// ------------------------------------------------------------------ Calendar connections (synced every 15 minutes)
export const listCalendarConnections = () => get<ConnectionOut[]>("/admin/calendar-connections");
export const createCalendarConnection = (body: ConnectionCreate) =>
  post<ConnectionOut>("/admin/calendar-connections", body);
export const updateCalendarConnection = (id: string, body: ConnectionUpdate) =>
  patch<ConnectionOut>(`/admin/calendar-connections/${id}`, body);
export const deleteCalendarConnection = (id: string) => del(`/admin/calendar-connections/${id}`);
/** "Connect with Google": the Google page to open in a popup (it comes back to the API's callback). */
export const startGoogleCalendar = () => post<GoogleStartOut>("/admin/calendar-connections/google/start");
/** "Connect Zoom": the Zoom page to open in a popup. Calendars whose location is Zoom then get a meeting per booking. */
export const startZoom = () => post<ZoomStartOut>("/admin/calendar-connections/zoom/start");

// ------------------------------------------------------------------ Public booking page
export const getPublicCalendar = (slug: string) => get<PublicCalendarOut>(`/public/booking/${slug}`);
export const getPublicSlots = (slug: string, day: string) => get<SlotsOut>(`/public/booking/${slug}/slots`, { day });
/** The booking and its "Add to calendar" links, for the confirmation screen. */
export const bookPublic = (slug: string, body: BookingRequest) => post<PublicBookingOut>(`/public/booking/${slug}`, body);
