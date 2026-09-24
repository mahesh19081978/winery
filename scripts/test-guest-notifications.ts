/**
 * VINORA — Phase 6.10: Guest Notifications & Communication Test Suite
 *
 * Usage:
 *   npx tsx scripts/test-guest-notifications.ts
 */
import { PrismaClient, NotificationChannel, NotificationType, ReviewStatus, BookingStatus, UserRole } from '@prisma/client';
import { GuestAuth } from '../src/lib/auth/guest';
import { setEmailProvider, type EmailProvider, type EmailMessage } from '../src/lib/email';
import {
  BookingService,
  AdminReviewService,
  GuestNotificationService,
} from '../src/server/services';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36);

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${name}${details ? ' - ' + details : ''}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${name}${details ? ' - ' + details : ''}`);
  }
}

class MockEmailProvider implements EmailProvider {
  public sentMessages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sentMessages.push(message);
  }

  clear() {
    this.sentMessages = [];
  }
}

async function main() {
  console.log(`\n🍷 Guest Notifications Test Suite — target: ${BASE_URL} (run: ${RUN})\n`);

  const mockEmail = new MockEmailProvider();
  setEmailProvider(mockEmail);

  // Setup: Find winery & experience
  const winery = await prisma.winery.findFirst({
    include: { experiences: true, events: { include: { schedules: true, ticketTypes: true } } },
  });
  if (!winery || winery.experiences.length === 0) {
    throw new Error('Precondition failed: active winery with experiences required');
  }
  const experience = winery.experiences[0];

  // Baseline winery data counts
  const initialWineriesCount = await prisma.winery.count();
  const initialExperiencesCount = await prisma.experience.count();

  // Create Guest A and Guest B
  const guestAEmail = `guest-a-${RUN}@example.com`;
  const guestBEmail = `guest-b-${RUN}@example.com`;

  const userA = await prisma.user.create({
    data: {
      email: guestAEmail,
      role: UserRole.GUEST,
      wineryId: winery.id,
      guestProfile: {
        create: {
          name: 'Notification Guest A',
          emailNotifications: true,
        },
      },
    },
    include: { guestProfile: true },
  });

  const userB = await prisma.user.create({
    data: {
      email: guestBEmail,
      role: UserRole.GUEST,
      wineryId: winery.id,
      guestProfile: {
        create: {
          name: 'Notification Guest B',
          emailNotifications: false,
        },
      },
    },
    include: { guestProfile: true },
  });

  const profileA = userA.guestProfile!;
  const profileB = userB.guestProfile!;

  const tokenA = await GuestAuth.createSessionToken({
    userId: userA.id,
    email: userA.email,
    role: UserRole.GUEST,
    guestProfileId: profileA.id,
    name: profileA.name,
  });

  const tokenB = await GuestAuth.createSessionToken({
    userId: userB.id,
    email: userB.email,
    role: UserRole.GUEST,
    guestProfileId: profileB.id,
    name: profileB.name,
  });

  const cookieHeaderA = `elysee_guest_session=${tokenA}`;
  const cookieHeaderB = `elysee_guest_session=${tokenB}`;

  // ========================================================
  // Test A: Unauthenticated GET -> 401
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications`);
    assert(res.status === 401, 'Test A: Unauthenticated GET -> 401', `status=${res.status}`);
  }

  // Create initial seeded notifications for testing
  const notifA1 = await prisma.notification.create({
    data: {
      recipient: guestAEmail,
      channel: NotificationChannel.PUSH,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: 'Booking Confirmed: Tasting 1',
      content: 'Your reservation for Tasting 1 has been confirmed.',
      metadata: {
        read: false,
        readAt: null,
        guestProfileId: profileA.id,
        eventType: 'BOOKING_CONFIRMATION',
        targetUrl: '/app/bookings',
      },
    },
  });

  const notifA2 = await prisma.notification.create({
    data: {
      recipient: guestAEmail,
      channel: NotificationChannel.PUSH,
      type: NotificationType.BOOKING_CANCELLATION,
      title: 'Booking Cancelled: Tasting 2',
      content: 'Your reservation for Tasting 2 has been cancelled.',
      metadata: {
        read: false,
        readAt: null,
        guestProfileId: profileA.id,
        eventType: 'BOOKING_CANCELLATION',
        targetUrl: '/app/bookings',
      },
    },
  });

  const notifB1 = await prisma.notification.create({
    data: {
      recipient: guestBEmail,
      channel: NotificationChannel.PUSH,
      type: NotificationType.REVIEW_REQUEST,
      title: 'Review Update for Guest B',
      content: 'Review status changed.',
      metadata: {
        read: false,
        readAt: null,
        guestProfileId: profileB.id,
        eventType: 'REVIEW_APPROVED',
        targetUrl: '/app/reviews',
      },
    },
  });

  // ========================================================
  // Test B: Guest A sees only Guest A notifications
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications`, {
      headers: { Cookie: cookieHeaderA },
    });
    const json = await res.json();
    assert(res.status === 200, 'Test B: Authenticated list succeeds', `status=${res.status}`);
    const items: Array<{ id: string; title: string }> = json.data?.items || [];
    const containsGuestA = items.some((i) => i.id === notifA1.id);
    const containsGuestB = items.some((i) => i.id === notifB1.id);
    assert(
      containsGuestA && !containsGuestB,
      'Test B: Guest A sees only Guest A notifications',
      `containsA=${containsGuestA}, containsB=${containsGuestB}`
    );
  }

  // ========================================================
  // Test C: Guest B cannot read Guest A notification by ID
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications/${notifA1.id}`, {
      headers: { Cookie: cookieHeaderB },
    });
    assert(
      res.status === 404,
      'Test C: Guest B cannot read Guest A notification by ID (fails safely with 404)',
      `status=${res.status}`
    );
  }

  // ========================================================
  // Test D: Guest B cannot mark Guest A notification as read
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications/${notifA1.id}`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieHeaderB,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'MARK_READ' }),
    });
    assert(
      res.status === 404,
      'Test D: Guest B cannot mark Guest A notification read (fails safely with 404)',
      `status=${res.status}`
    );
  }

  // ========================================================
  // Test E: Spoofed guestProfileId is ignored/rejected
  // ========================================================
  {
    const res = await fetch(
      `${BASE_URL}/api/auth/guest/notifications?guestProfileId=${profileB.id}`,
      { headers: { Cookie: cookieHeaderA } }
    );
    const json = await res.json();
    const items: Array<{ id: string }> = json.data?.items || [];
    const containsB = items.some((i) => i.id === notifB1.id);
    assert(
      !containsB && items.length > 0,
      'Test E: Spoofed guestProfileId is ignored, DB ownership enforced',
      `containsB=${containsB}`
    );
  }

  // ========================================================
  // Test F: Spoofed userId is ignored/rejected
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications?userId=${userB.id}`, {
      headers: { Cookie: cookieHeaderA },
    });
    const json = await res.json();
    const items: Array<{ id: string }> = json.data?.items || [];
    const containsB = items.some((i) => i.id === notifB1.id);
    assert(
      !containsB && items.length > 0,
      'Test F: Spoofed userId is ignored, DB ownership enforced',
      `containsB=${containsB}`
    );
  }

  // ========================================================
  // Test G: Pagination works
  // ========================================================
  {
    const resPage1 = await fetch(`${BASE_URL}/api/auth/guest/notifications?page=1&pageSize=1`, {
      headers: { Cookie: cookieHeaderA },
    });
    const jsonPage1 = await resPage1.json();
    const resPage2 = await fetch(`${BASE_URL}/api/auth/guest/notifications?page=2&pageSize=1`, {
      headers: { Cookie: cookieHeaderA },
    });
    const jsonPage2 = await resPage2.json();

    const p1Item = jsonPage1.data?.items?.[0];
    const p2Item = jsonPage2.data?.items?.[0];

    assert(
      p1Item && p2Item && p1Item.id !== p2Item.id && jsonPage1.data?.pagination?.totalPages >= 2,
      'Test G: Pagination returns distinct items per page',
      `page1=${p1Item?.id}, page2=${p2Item?.id}`
    );
  }

  // ========================================================
  // Test H: unread filter works
  // ========================================================
  {
    // First, let's mark notifA2 as read directly in DB
    await prisma.notification.update({
      where: { id: notifA2.id },
      data: { metadata: { read: true, readAt: new Date().toISOString() } },
    });

    const resUnread = await fetch(`${BASE_URL}/api/auth/guest/notifications?type=unread`, {
      headers: { Cookie: cookieHeaderA },
    });
    const jsonUnread = await resUnread.json();
    const unreadItems: Array<{ id: string; read: boolean }> = jsonUnread.data?.items || [];

    const allAreUnread = unreadItems.every((item) => item.read === false);
    const hasUnreadA1 = unreadItems.some((item) => item.id === notifA1.id);
    const hasReadA2 = unreadItems.some((item) => item.id === notifA2.id);

    assert(
      allAreUnread && hasUnreadA1 && !hasReadA2,
      'Test H: type=unread filter returns only unread notifications',
      `allUnread=${allAreUnread}, hasA1=${hasUnreadA1}, hasReadA2=${hasReadA2}`
    );
  }

  // ========================================================
  // Test I: unreadCount is accurate
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications`, {
      headers: { Cookie: cookieHeaderA },
    });
    const json = await res.json();
    assert(
      json.data?.unreadCount === 1,
      'Test I: unreadCount is accurate',
      `expected=1, actual=${json.data?.unreadCount}`
    );
  }

  // ========================================================
  // Test J: mark-read works
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications/${notifA1.id}`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieHeaderA,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'MARK_READ' }),
    });
    const json = await res.json();
    assert(
      res.status === 200 && json.data?.read === true && json.data?.isRead === true && Boolean(json.data?.readAt),
      'Test J: mark-read works and returns updated safe DTO',
      `status=${res.status}, read=${json.data?.read}`
    );
  }

  // ========================================================
  // Test K: repeated mark-read is idempotent
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications/${notifA1.id}`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieHeaderA,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'MARK_READ' }),
    });
    const json = await res.json();
    assert(
      res.status === 200 && json.data?.read === true,
      'Test K: repeated mark-read is idempotent',
      `status=${res.status}, read=${json.data?.read}`
    );
  }

  // ========================================================
  // Test L: mark-all-read works if implemented
  // ========================================================
  {
    // Create two new unread notifications for Guest A
    await prisma.notification.create({
      data: {
        recipient: guestAEmail,
        channel: NotificationChannel.PUSH,
        type: NotificationType.BOOKING_CONFIRMATION,
        title: 'Unread 1',
        content: 'Content 1',
        metadata: { read: false },
      },
    });
    await prisma.notification.create({
      data: {
        recipient: guestAEmail,
        channel: NotificationChannel.PUSH,
        type: NotificationType.BOOKING_CONFIRMATION,
        title: 'Unread 2',
        content: 'Content 2',
        metadata: { read: false },
      },
    });

    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieHeaderA,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'MARK_ALL_READ' }),
    });
    const json = await res.json();
    assert(
      res.status === 200 && json.data?.markedCount >= 2,
      'Test L: mark-all-read works',
      `status=${res.status}, markedCount=${json.data?.markedCount}`
    );

    const countCheck = await prisma.notification.count({
      where: { recipient: guestAEmail, metadata: { path: ['read'], equals: false } },
    });
    assert(countCheck === 0, 'Test L: Remaining unread count is 0 after mark-all-read');
  }

  // ========================================================
  // Test M: notification DTO does not expose secrets
  // ========================================================
  {
    const res = await fetch(`${BASE_URL}/api/auth/guest/notifications`, {
      headers: { Cookie: cookieHeaderA },
    });
    const json = await res.json();
    const item = json.data?.items?.[0];
    const hasSecretKey =
      item &&
      ('password' in item ||
        'passwordHash' in item ||
        'token' in item ||
        'secret' in item ||
        'apiKey' in item ||
        'recipient' in item);
    assert(!hasSecretKey && Boolean(item?.id), 'Test M: Notification DTO does not expose secrets or recipient email');
  }

  // ========================================================
  // Test N: booking confirmation creates exactly one notification
  // ========================================================
  let createdBookingNumber = '';
  {
    mockEmail.clear();
    const initialCount = await prisma.notification.count({ where: { recipient: guestAEmail } });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const booking = await BookingService.createBooking(
      {
        experienceSlug: experience.slug,
        date: dateStr,
        time: '14:00',
        adults: 2,
        children: 0,
        guestName: 'Notification Guest A',
        guestEmail: guestAEmail,
        guestPhone: '555-0199',
        specialRequests: '',
        dietaryRequirements: '',
      },
      {
        userId: userA.id,
        email: userA.email,
        role: UserRole.GUEST,
        guestProfileId: profileA.id,
        name: profileA.name,
      }
    );
    createdBookingNumber = booking.bookingNumber;

    const afterCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    assert(
      afterCount === initialCount + 1,
      'Test N: booking confirmation creates exactly one notification',
      `before=${initialCount}, after=${afterCount}`
    );
  }

  // ========================================================
  // Test O: repeated/idempotent booking operation does not duplicate notification
  // ========================================================
  {
    // Verify each booking created has unique booking number and notification
    const notifs = await prisma.notification.findMany({
      where: {
        recipient: guestAEmail,
        metadata: { path: ['bookingNumber'], equals: createdBookingNumber },
      },
    });
    assert(
      notifs.length === 1,
      'Test O: Exactly one notification exists for the created booking number',
      `count=${notifs.length}`
    );
  }

  // ========================================================
  // Test P: booking cancellation creates notification
  // ========================================================
  {
    const beforeCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    const cancelled = await BookingService.cancelBooking(createdBookingNumber, 'Schedule conflict');
    assert(cancelled.status === BookingStatus.CANCELLED, 'Booking cancelled successfully');

    const afterCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    assert(
      afterCount === beforeCount + 1,
      'Test P: booking cancellation creates notification',
      `before=${beforeCount}, after=${afterCount}`
    );
  }

  // ========================================================
  // Test Q: repeated cancellation does not duplicate notification
  // ========================================================
  {
    const beforeCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    const repeated = await BookingService.cancelBooking(createdBookingNumber, 'Repeated cancellation request');
    assert(repeated.status === BookingStatus.CANCELLED, 'Repeated cancellation returns cancelled status');

    const afterCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    assert(
      afterCount === beforeCount,
      'Test Q: repeated cancellation does not duplicate notification',
      `before=${beforeCount}, after=${afterCount}`
    );
  }

  // ========================================================
  // Test R: approved review creates notification
  // ========================================================
  let approvedReviewId = '';
  {
    const reviewA = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId: profileA.id,
        authorName: profileA.name,
        category: 'WINE_TASTING',
        rating: 5,
        title: `Spectacular Reserve Tasting ${RUN}`,
        comment: 'Truly an exquisite tasting experience on the estate.',
        targetName: 'Reserve Tasting',
        status: ReviewStatus.PENDING,
      },
    });
    approvedReviewId = reviewA.id;

    const beforeCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    await AdminReviewService.moderateReview(
      reviewA.id,
      { action: 'APPROVE' },
      { wineryId: winery.id }
    );
    const afterCount = await prisma.notification.count({ where: { recipient: guestAEmail } });

    assert(
      afterCount === beforeCount + 1,
      'Test R: approved review creates notification',
      `before=${beforeCount}, after=${afterCount}`
    );
  }

  // ========================================================
  // Test S: rejected review creates notification
  // ========================================================
  {
    const reviewB = await prisma.review.create({
      data: {
        wineryId: winery.id,
        guestProfileId: profileA.id,
        authorName: profileA.name,
        category: 'WINE_TASTING',
        rating: 1,
        title: `Spam Review ${RUN}`,
        comment: 'Irrelevant advertisement spam content.',
        targetName: 'Reserve Tasting',
        status: ReviewStatus.PENDING,
      },
    });

    const beforeCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    await AdminReviewService.moderateReview(
      reviewB.id,
      { action: 'REJECT' },
      { wineryId: winery.id }
    );
    const afterCount = await prisma.notification.count({ where: { recipient: guestAEmail } });

    assert(
      afterCount === beforeCount + 1,
      'Test S: rejected review creates notification',
      `before=${beforeCount}, after=${afterCount}`
    );
  }

  // ========================================================
  // Test T: repeated moderation request does not duplicate notification
  // ========================================================
  {
    const beforeCount = await prisma.notification.count({ where: { recipient: guestAEmail } });
    // Calling moderateReview with same status on already approved review is idempotent
    await AdminReviewService.moderateReview(
      approvedReviewId,
      { action: 'APPROVE' },
      { wineryId: winery.id }
    );
    const afterCount = await prisma.notification.count({ where: { recipient: guestAEmail } });

    assert(
      afterCount === beforeCount,
      'Test T: repeated moderation request does not duplicate notification',
      `before=${beforeCount}, after=${afterCount}`
    );
  }

  // ========================================================
  // Test U: email preference ON allows email dispatch through provider abstraction
  // ========================================================
  {
    mockEmail.clear();
    // Guest A has emailNotifications = true
    const notifBefore = mockEmail.sentMessages.length;
    await GuestNotificationService.notifyExperienceBookingConfirmed(
      {
        bookingNumber: `DVR-TEST-${RUN}`,
        guestProfileId: profileA.id,
        date: new Date(),
        time: '11:00',
        totalGuests: 2,
      },
      'Estate Signature Tasting'
    );
    const notifAfter = mockEmail.sentMessages.length;
    const sentToGuestA = mockEmail.sentMessages.some((m) => m.to === guestAEmail);

    assert(
      notifAfter > notifBefore && sentToGuestA,
      'Test U: email preference ON dispatches email via provider abstraction',
      `messagesCount=${notifAfter}, sentToA=${sentToGuestA}`
    );
  }

  // ========================================================
  // Test V: email preference OFF does not dispatch email
  // ========================================================
  {
    mockEmail.clear();
    // Guest B has emailNotifications = false
    await GuestNotificationService.notifyExperienceBookingConfirmed(
      {
        bookingNumber: `DVR-TEST-B-${RUN}`,
        guestProfileId: profileB.id,
        date: new Date(),
        time: '15:00',
        totalGuests: 1,
      },
      'Estate Signature Tasting'
    );
    const sentToGuestB = mockEmail.sentMessages.some((m) => m.to === guestBEmail);

    assert(
      !sentToGuestB && mockEmail.sentMessages.length === 0,
      'Test V: email preference OFF suppresses email dispatch',
      `sentMessages=${mockEmail.sentMessages.length}`
    );
  }

  // ========================================================
  // Test W: test cleanup removes all test users/profiles/notifications
  // ========================================================
  {
    // Clean up notifications for test recipients
    await prisma.notification.deleteMany({
      where: { recipient: { in: [guestAEmail, guestBEmail] } },
    });

    // Clean up reviews created in test
    await prisma.review.deleteMany({
      where: { guestProfileId: { in: [profileA.id, profileB.id] } },
    });

    // Clean up bookings created in test
    await prisma.bookingGuest.deleteMany({
      where: { booking: { guestProfileId: { in: [profileA.id, profileB.id] } } },
    });
    await prisma.bookingItem.deleteMany({
      where: { booking: { guestProfileId: { in: [profileA.id, profileB.id] } } },
    });
    await prisma.bookingStatusHistory.deleteMany({
      where: { booking: { guestProfileId: { in: [profileA.id, profileB.id] } } },
    });
    await prisma.booking.deleteMany({
      where: { guestProfileId: { in: [profileA.id, profileB.id] } },
    });

    // Clean up guest profiles and users
    await prisma.guestProfile.deleteMany({
      where: { id: { in: [profileA.id, profileB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });

    const remainingUsers = await prisma.user.count({
      where: { id: { in: [userA.id, userB.id] } },
    });
    const remainingNotifs = await prisma.notification.count({
      where: { recipient: { in: [guestAEmail, guestBEmail] } },
    });

    assert(
      remainingUsers === 0 && remainingNotifs === 0,
      'Test W: test cleanup removes all test users/profiles/notifications',
      `remainingUsers=${remainingUsers}, remainingNotifs=${remainingNotifs}`
    );
  }

  // ========================================================
  // Test X: legitimate existing winery data remains untouched
  // ========================================================
  {
    const finalWineriesCount = await prisma.winery.count();
    const finalExperiencesCount = await prisma.experience.count();

    assert(
      finalWineriesCount === initialWineriesCount && finalExperiencesCount === initialExperiencesCount,
      'Test X: legitimate existing winery data remains untouched',
      `wineries: ${initialWineriesCount}->${finalWineriesCount}, experiences: ${initialExperiencesCount}->${finalExperiencesCount}`
    );
  }

  // Restore email provider
  setEmailProvider(null);

  console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
