import type { UserRole } from '@prisma/client';

/**
 * Pure role -> permission data for the VINORA admin portal.
 *
 * This module has NO server-only dependencies (no next/server, no cookies, no
 * services) so it can be imported safely from anywhere: route handlers, server
 * components, client components (navigation chrome) and the proxy/edge layer.
 * The authorization GUARDS live in ./permissions.
 */

/** Every staff role (UserRole minus GUEST). */
export type StaffRole = Exclude<UserRole, 'GUEST'>;

/** Every permission understood by the application. */
export const PERMISSIONS = [
  'dashboard.view',
  'frontDesk.access',
  'bookings.view',
  'bookings.manage',
  'calendar.view',
  'availability.view',
  'availability.manage',
  'experiences.view',
  'experiences.manage',
  'events.manage',
  'eventBookings.manage',
  'wines.manage',
  'vintages.manage',
  'tastings.manage',
  'guests.view',
  'guests.edit',
  'guest.delete',
  'profiles.view',
  'payments.view',
  'payments.record',
  'payments.refund',
  'payments.manage',
  'reviews.view',
  'reviews.moderate',
  'gallery.manage',
  'website.images.manage',
  'inquiries.view',
  'inquiries.manage',
  'conversations.view',
  'notifications.view',
  'staff.view',
  'staff.manage',
  'settings.view',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Staff roles permitted to reach the admin portal at all (mirrors AuthService.isStaffRole). */
export const STAFF_ROLES: readonly StaffRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'RECEPTION',
  'EVENT_MANAGER',
  'WINE_STAFF',
  'TELECALLER',
];

/**
 * APPROVED ROLE / PERMISSION MATRIX.
 * Add nothing here without an approved matrix change - a role must never gain a
 * permission just because a module happens to be reachable today.
 */
export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    'dashboard.view',
    'frontDesk.access',
    'bookings.view',
    'bookings.manage',
    'calendar.view',
    'availability.view',
    'availability.manage',
    'experiences.view',
    'experiences.manage',
    'events.manage',
    'eventBookings.manage',
    'wines.manage',
    'vintages.manage',
    'tastings.manage',
    'guests.view',
    'guests.edit',
    'guest.delete',
    'profiles.view',
    'payments.view',
    'payments.record',
    'payments.refund',
    'payments.manage',
    'reviews.view',
    'reviews.moderate',
    'gallery.manage',
    'website.images.manage',
    'inquiries.view',
    'inquiries.manage',
    'conversations.view',
    'notifications.view',
    'staff.view',
    'staff.manage',
    'settings.view',
    'settings.manage',
  ],
  ADMIN: [
    'dashboard.view',
    'frontDesk.access',
    'bookings.view',
    'bookings.manage',
    'calendar.view',
    'availability.view',
    'availability.manage',
    'experiences.view',
    'experiences.manage',
    'events.manage',
    'eventBookings.manage',
    'wines.manage',
    'vintages.manage',
    'tastings.manage',
    'guests.view',
    'guests.edit',
    'profiles.view',
    'payments.view',
    'payments.record',
    'payments.refund',
    'payments.manage',
    'reviews.view',
    'reviews.moderate',
    'gallery.manage',
    'website.images.manage',
    'inquiries.view',
    'inquiries.manage',
    'conversations.view',
    'notifications.view',
    'staff.view',
    'staff.manage',
    'settings.view',
    'settings.manage',
  ],
  MANAGER: [
    'dashboard.view',
    'frontDesk.access',
    'bookings.view',
    'bookings.manage',
    'calendar.view',
    'availability.view',
    'availability.manage',
    'experiences.view',
    'experiences.manage',
    'eventBookings.manage',
    'tastings.manage',
    'guests.view',
    'guests.edit',
    'profiles.view',
    'payments.view',
    'payments.record',
    'payments.refund',
    'reviews.view',
    'reviews.moderate',
    'gallery.manage',
    'website.images.manage',
    'inquiries.view',
    'inquiries.manage',
    'conversations.view',
    'notifications.view',
  ],
  RECEPTION: [
    'dashboard.view',
    'frontDesk.access',
    'bookings.view',
    'bookings.manage',
    'calendar.view',
    'availability.view',
    'eventBookings.manage',
    'tastings.manage',
    'guests.view',
    'guests.edit',
    'profiles.view',
    'payments.view',
    'payments.record',
    'inquiries.view',
    'inquiries.manage',
    'conversations.view',
    'notifications.view',
  ],
  EVENT_MANAGER: [
    'dashboard.view',
    'bookings.view',
    'bookings.manage',
    'calendar.view',
    'eventBookings.manage',
    'guests.view',
    'payments.view',
    'notifications.view',
  ],
  WINE_STAFF: [
    'dashboard.view',
    'bookings.view',
    'calendar.view',
    'experiences.view',
    'tastings.manage',
    'guests.view',
    'profiles.view',
    'reviews.view',
    'gallery.manage',
    'notifications.view',
    'wines.manage',
    'vintages.manage',
  ],
  TELECALLER: [
    'dashboard.view',
    'bookings.view',
    'guests.view',
    'inquiries.view',
    'inquiries.manage',
    'conversations.view',
    'notifications.view',
  ],
};

/** Descriptive role copy shown in the staff console (labels only - never authorization data). */
export const ROLE_META: Record<StaffRole, { label: string; desc: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    desc: 'Unrestricted master access to cellar ledger, security policies, billing, and staff administration',
  },
  ADMIN: {
    label: 'Administrator',
    desc: 'Comprehensive access to bookings, guests, inventory, staff and estate configuration',
  },
  MANAGER: {
    label: 'Estate Manager',
    desc: 'Day-to-day hospitality scheduling, time slot controls, and review moderation',
  },
  WINE_STAFF: {
    label: 'Sommelier & Wine Staff',
    desc: 'Cellar tasting records, vintage ratings, and tasting flight execution',
  },
  EVENT_MANAGER: {
    label: 'Event Manager',
    desc: 'Winery event calendar, ticket tier capacity, and check-in rosters',
  },
  RECEPTION: {
    label: 'Front Desk Receptionist',
    desc: 'Guest arrival check-in, walk-in reservations, and tasting salon greeting',
  },
  TELECALLER: {
    label: 'Telecaller',
    desc: 'Outbound guest follow-ups, inquiry callbacks, and reservation reminders',
  },
};

/**
 * Can this role perform this action?
 * Fail-closed: GUEST, unknown or missing roles never receive a permission.
 */
export function can(
  role: UserRole | string | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role as StaffRole];
  if (!granted) return false;
  return (granted as readonly string[]).includes(permission);
}

/** All permissions granted to a role (empty array for GUEST / unknown roles). */
export function getPermissions(
  role: UserRole | string | null | undefined
): Permission[] {
  if (!role) return [];
  const granted = ROLE_PERMISSIONS[role as StaffRole];
  return granted ? [...granted] : [];
}

/** Every role/permission pair - used by the staff console role matrix. */
export function getRoleMatrix(): {
  role: StaffRole;
  label: string;
  desc: string;
  permissions: Permission[];
}[] {
  return STAFF_ROLES.map((role) => ({
    role,
    label: ROLE_META[role].label,
    desc: ROLE_META[role].desc,
    permissions: getPermissions(role),
  }));
}
