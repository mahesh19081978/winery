# Winery Booking Software — Domaine Élysée / Val de Rêve Estate

Customer-facing luxury winery and vineyard experience platform built with Next.js App Router, React 19, TypeScript, and Tailwind CSS.

---

## 🍇 Features

* **Winery Discovery**: Immersive editorial homepage showcasing estate terroir, history, and cellar architecture.
* **Wine Catalogue**: Filterable by category (Red, White, Rosé, Sparkling, Reserve) with sorting by vintage, rating, and price.
* **Wine Details**: In-depth wine profiles featuring interactive 4-axis SVG Diamond Taste Radars, 10-pip sensory gauges, food pairings, cellaring potential, and related vintages.
* **Winery Experiences**: Curated cellar tours, private tastings, vineyard walks, and sunset wine dinners with timelines, wine inclusions, and FAQs.
* **Events Calendar**: Upcoming harvest celebrations, masterclasses, and jazz evenings with interactive ticket selection and seat reservations.
* **Multi-Step Booking Engine**: 7-step booking process (Experience -> Date -> Time -> Guests -> Contact/Dietary -> Review -> Confirmation).
* **Digital Booking Voucher**: Boarding-pass voucher with QR code, print-to-PDF, native share, reschedule, and cancellation simulations.
* **Wine Tasting Journal**: Personal tasting impressions ledger with flavor tags, ratings filter, and sensory radar profiles.
* **Guest Reviews**: Community feedback, aggregate scores, and review submission modal.
* **Guest Account Portal**: Personalized member dashboard tracking estate visits, tasting logs, cellar wishlist, registered events, and palate calibration sliders.
* **Wine Concierge & Voice UI**: Floating sommelier chat assistant with interactive prompt chips and simulated voice assistant with animated waveforms.

---

## 🛠️ Technology Stack

* **Framework**: [Next.js](https://nextjs.org/) (v16 App Router)
* **Library**: [React](https://react.dev/) 19
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 📌 Current Status

**Frontend phase complete.**

The current version uses realistic mock data and client-side `localStorage` state management for booking flows, reviews, tasting logs, and profile preferences. Backend functionality has **NOT** yet been implemented.

---

## 🔮 Future Phases

* **PostgreSQL & Prisma**: Relational persistence for bookings, wines, user accounts, and reviews.
* **Authentication**: Member authentication and social login (Google, Apple).
* **Real Availability Engine**: Real-time slot management and table capacity controls.
* **Payment Gateway**: Stripe / Apple Pay checkout integration.
* **Guest CRM**: Winery hospitality management and cellar allocations.
* **Notifications**: Automated transactional Email, SMS, and WhatsApp alerts.
* **AI Concierge API**: Large language model integration with estate sommelier knowledge base.
* **Voice / Telecaller Agent**: Real-time telephony integration for hands-free voice booking.
* **Winery Admin & Staff Dashboard**: Tasting room check-in scanner and reservation scheduling.
* **Analytics**: Revenue, visitor flow, and vintage preference reporting.

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18.18+ or 20+
* npm, pnpm, or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/mahesh19081978/winery.git

# Enter project directory
cd winery

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production
```bash
# Run ESLint check
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start
```
