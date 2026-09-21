-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTION', 'WINE_STAFF', 'EVENT_MANAGER', 'TELECALLER', 'GUEST');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "WineCategory" AS ENUM ('RED', 'WHITE', 'ROSE', 'SPARKLING', 'RESERVE', 'DESSERT');

-- CreateEnum
CREATE TYPE "ExperienceCategory" AS ENUM ('TASTING', 'TOUR', 'CULINARY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventAvailability" AS ENUM ('AVAILABLE', 'FEW_SEATS_LEFT', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewCategory" AS ENUM ('WINE_TASTING', 'VINEYARD_TOUR', 'EVENTS', 'FOOD');

-- CreateEnum
CREATE TYPE "DrinkAgainOption" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WEB_CHAT', 'VOICE', 'PHONE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'BOOKING_MODIFICATION', 'BOOKING_CANCELLATION', 'EVENT_REMINDER', 'REVIEW_REQUEST');

-- CreateTable
CREATE TABLE "wineries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "story" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "openingHours" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wineries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'GUEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "dietaryPreferences" TEXT,
    "notes" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNotifications" BOOLEAN NOT NULL DEFAULT false,
    "visitsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_wine_preferences" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "favoriteVarietals" TEXT[],
    "preferredSweetness" TEXT,
    "preferredBody" TEXT,
    "preferredAcidity" TEXT,
    "favoriteWineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_wine_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wines" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "WineCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "story" TEXT,
    "vineyardParcel" TEXT,
    "servingTemp" TEXT,
    "cellarPotential" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "characteristics" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wine_vintages" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "vintageYear" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "alcohol" TEXT NOT NULL,
    "oakAging" TEXT,
    "tastingNotes" TEXT,
    "aromaTags" TEXT[],
    "body" INTEGER NOT NULL DEFAULT 5,
    "acidity" INTEGER NOT NULL DEFAULT 5,
    "sweetness" INTEGER NOT NULL DEFAULT 2,
    "tannin" INTEGER NOT NULL DEFAULT 5,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "inventoryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wine_vintages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wine_images" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wine_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wine_food_pairings" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "dishName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wine_food_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ExperienceCategory" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "durationText" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 12,
    "minGuests" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER NOT NULL DEFAULT 12,
    "foodPairing" TEXT,
    "highlights" TEXT[],
    "includedItems" TEXT[],
    "guestExpectations" TEXT[],
    "importantInfo" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_images" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_faqs" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_timelines" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "timeRange" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_wines" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_wines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "experienceId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotInterval" INTEGER NOT NULL DEFAULT 60,
    "capacity" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slot_overrides" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slot_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "winery_closures" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "winery_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "totalGuests" INTEGER NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "specialRequests" TEXT,
    "dietaryRequirements" TEXT,
    "qrCodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guestProfileId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "dietaryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "experienceId" TEXT,
    "itemType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_histories" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus" NOT NULL,
    "toStatus" "BookingStatus" NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerPaymentId" TEXT,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "timeRange" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "availability" "EventAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "availableTickets" INTEGER NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "entertainment" TEXT,
    "featuredImage" TEXT NOT NULL,
    "winesServed" TEXT[],
    "culinaryMenu" TEXT[],
    "galleryImages" TEXT[],
    "isPast" BOOLEAN NOT NULL DEFAULT false,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_schedules" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_faqs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_ticket_types" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bookings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventTicketTypeId" TEXT,
    "guestProfileId" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasting_sessions" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "bookingId" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasting_records" (
    "id" TEXT NOT NULL,
    "tastingSessionId" TEXT,
    "guestProfileId" TEXT NOT NULL,
    "wineVintageId" TEXT NOT NULL,
    "wineNameSnapshot" TEXT NOT NULL,
    "vintageYear" INTEGER NOT NULL,
    "experienceName" TEXT,
    "rating" DECIMAL(2,1) NOT NULL,
    "tasteCharacteristics" TEXT[],
    "notes" TEXT NOT NULL,
    "wouldDrinkAgain" "DrinkAgainOption" NOT NULL DEFAULT 'YES',
    "body" INTEGER NOT NULL DEFAULT 5,
    "acidity" INTEGER NOT NULL DEFAULT 5,
    "sweetness" INTEGER NOT NULL DEFAULT 2,
    "tannin" INTEGER NOT NULL DEFAULT 5,
    "tastedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasting_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "guestProfileId" TEXT,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "category" "ReviewCategory" NOT NULL,
    "targetName" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "experienceId" TEXT,
    "wineId" TEXT,
    "eventId" TEXT,
    "bookingId" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "wineryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'WEB_CHAT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCallName" TEXT,
    "toolCallData" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_calls" (
    "id" TEXT NOT NULL,
    "guestProfileId" TEXT,
    "callerPhone" TEXT NOT NULL,
    "direction" "CallDirection" NOT NULL DEFAULT 'INBOUND',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "durationSec" INTEGER,
    "transcript" TEXT,
    "outcome" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "voiceCallId" TEXT NOT NULL,
    "logLevel" TEXT NOT NULL DEFAULT 'INFO',
    "event" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wineries_slug_key" ON "wineries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "guest_profiles_userId_key" ON "guest_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_wine_preferences_guestProfileId_key" ON "guest_wine_preferences"("guestProfileId");

-- CreateIndex
CREATE INDEX "guest_wine_preferences_favoriteWineId_idx" ON "guest_wine_preferences"("favoriteWineId");

-- CreateIndex
CREATE INDEX "wines_wineryId_idx" ON "wines"("wineryId");

-- CreateIndex
CREATE UNIQUE INDEX "wines_wineryId_slug_key" ON "wines"("wineryId", "slug");

-- CreateIndex
CREATE INDEX "wine_vintages_wineId_idx" ON "wine_vintages"("wineId");

-- CreateIndex
CREATE UNIQUE INDEX "wine_vintages_wineId_vintageYear_key" ON "wine_vintages"("wineId", "vintageYear");

-- CreateIndex
CREATE INDEX "wine_images_wineId_idx" ON "wine_images"("wineId");

-- CreateIndex
CREATE INDEX "wine_food_pairings_wineId_idx" ON "wine_food_pairings"("wineId");

-- CreateIndex
CREATE UNIQUE INDEX "wine_food_pairings_wineId_dishName_key" ON "wine_food_pairings"("wineId", "dishName");

-- CreateIndex
CREATE INDEX "experiences_wineryId_idx" ON "experiences"("wineryId");

-- CreateIndex
CREATE UNIQUE INDEX "experiences_wineryId_slug_key" ON "experiences"("wineryId", "slug");

-- CreateIndex
CREATE INDEX "experience_images_experienceId_idx" ON "experience_images"("experienceId");

-- CreateIndex
CREATE INDEX "experience_faqs_experienceId_idx" ON "experience_faqs"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_faqs_experienceId_question_key" ON "experience_faqs"("experienceId", "question");

-- CreateIndex
CREATE INDEX "experience_timelines_experienceId_idx" ON "experience_timelines"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "experience_timelines_experienceId_title_key" ON "experience_timelines"("experienceId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "experience_wines_experienceId_wineId_key" ON "experience_wines"("experienceId", "wineId");

-- CreateIndex
CREATE INDEX "availability_rules_wineryId_dayOfWeek_idx" ON "availability_rules"("wineryId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "time_slot_overrides_experienceId_date_idx" ON "time_slot_overrides"("experienceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "time_slot_overrides_experienceId_date_time_key" ON "time_slot_overrides"("experienceId", "date", "time");

-- CreateIndex
CREATE INDEX "winery_closures_wineryId_startDate_endDate_idx" ON "winery_closures"("wineryId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "bookings_wineryId_date_status_idx" ON "bookings"("wineryId", "date", "status");

-- CreateIndex
CREATE INDEX "bookings_guestProfileId_idx" ON "bookings"("guestProfileId");

-- CreateIndex
CREATE INDEX "bookings_bookingNumber_idx" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "booking_guests_bookingId_idx" ON "booking_guests"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_guests_bookingId_fullName_key" ON "booking_guests"("bookingId", "fullName");

-- CreateIndex
CREATE INDEX "booking_items_bookingId_idx" ON "booking_items"("bookingId");

-- CreateIndex
CREATE INDEX "booking_status_histories_bookingId_idx" ON "booking_status_histories"("bookingId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "events_wineryId_eventDate_idx" ON "events"("wineryId", "eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "events_wineryId_slug_key" ON "events"("wineryId", "slug");

-- CreateIndex
CREATE INDEX "event_schedules_eventId_idx" ON "event_schedules"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_schedules_eventId_timeSlot_activity_key" ON "event_schedules"("eventId", "timeSlot", "activity");

-- CreateIndex
CREATE INDEX "event_faqs_eventId_idx" ON "event_faqs"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_faqs_eventId_question_key" ON "event_faqs"("eventId", "question");

-- CreateIndex
CREATE INDEX "event_ticket_types_eventId_idx" ON "event_ticket_types"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_ticket_types_eventId_name_key" ON "event_ticket_types"("eventId", "name");

-- CreateIndex
CREATE INDEX "event_bookings_eventId_idx" ON "event_bookings"("eventId");

-- CreateIndex
CREATE INDEX "event_bookings_guestProfileId_idx" ON "event_bookings"("guestProfileId");

-- CreateIndex
CREATE INDEX "tasting_sessions_guestProfileId_idx" ON "tasting_sessions"("guestProfileId");

-- CreateIndex
CREATE INDEX "tasting_records_guestProfileId_idx" ON "tasting_records"("guestProfileId");

-- CreateIndex
CREATE INDEX "tasting_records_wineVintageId_idx" ON "tasting_records"("wineVintageId");

-- CreateIndex
CREATE INDEX "reviews_wineryId_status_idx" ON "reviews"("wineryId", "status");

-- CreateIndex
CREATE INDEX "reviews_guestProfileId_idx" ON "reviews"("guestProfileId");

-- CreateIndex
CREATE INDEX "reviews_experienceId_idx" ON "reviews"("experienceId");

-- CreateIndex
CREATE INDEX "reviews_wineId_idx" ON "reviews"("wineId");

-- CreateIndex
CREATE INDEX "reviews_eventId_idx" ON "reviews"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_wineryId_authorName_title_key" ON "reviews"("wineryId", "authorName", "title");

-- CreateIndex
CREATE INDEX "gallery_images_wineryId_category_idx" ON "gallery_images"("wineryId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_images_wineryId_title_key" ON "gallery_images"("wineryId", "title");

-- CreateIndex
CREATE INDEX "conversations_guestProfileId_idx" ON "conversations"("guestProfileId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "voice_calls_guestProfileId_idx" ON "voice_calls"("guestProfileId");

-- CreateIndex
CREATE INDEX "call_logs_voiceCallId_idx" ON "call_logs"("voiceCallId");

-- CreateIndex
CREATE INDEX "notifications_recipient_channel_idx" ON "notifications"("recipient", "channel");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_wine_preferences" ADD CONSTRAINT "guest_wine_preferences_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_wine_preferences" ADD CONSTRAINT "guest_wine_preferences_favoriteWineId_fkey" FOREIGN KEY ("favoriteWineId") REFERENCES "wines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wines" ADD CONSTRAINT "wines_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wine_vintages" ADD CONSTRAINT "wine_vintages_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wine_images" ADD CONSTRAINT "wine_images_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wine_food_pairings" ADD CONSTRAINT "wine_food_pairings_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_images" ADD CONSTRAINT "experience_images_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_faqs" ADD CONSTRAINT "experience_faqs_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_timelines" ADD CONSTRAINT "experience_timelines_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_wines" ADD CONSTRAINT "experience_wines_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_wines" ADD CONSTRAINT "experience_wines_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slot_overrides" ADD CONSTRAINT "time_slot_overrides_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winery_closures" ADD CONSTRAINT "winery_closures_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_schedules" ADD CONSTRAINT "event_schedules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_faqs" ADD CONSTRAINT "event_faqs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_types" ADD CONSTRAINT "event_ticket_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_eventTicketTypeId_fkey" FOREIGN KEY ("eventTicketTypeId") REFERENCES "event_ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_sessions" ADD CONSTRAINT "tasting_sessions_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_sessions" ADD CONSTRAINT "tasting_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_records" ADD CONSTRAINT "tasting_records_tastingSessionId_fkey" FOREIGN KEY ("tastingSessionId") REFERENCES "tasting_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_records" ADD CONSTRAINT "tasting_records_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasting_records" ADD CONSTRAINT "tasting_records_wineVintageId_fkey" FOREIGN KEY ("wineVintageId") REFERENCES "wine_vintages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "wines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "wineries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "guest_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "voice_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
