# Track Unity

Track Unity is an AI-assisted opportunity management platform that converts scattered internship and job notifications into structured, searchable, and trackable opportunity cards.

It helps students avoid missing deadlines by centralizing data from text messages, images, Telegram, and email, then prioritizing what to apply for first.

## Problem Statement

### Description

An internship opportunity appears in a WhatsApp group. Someone forwards it to another group, and then it arrives again by email. Now you are scrolling through 300 messages trying to find the link, the eligibility, and the deadline.

### Problem Statement

How might we ensure students can track opportunities and deadlines without searching through endless message threads?

### Tasks

- Analysis: Analyze opportunity notifications to identify common sources, patterns, and key details such as company, role, eligibility, and deadlines.
- Design: Create a clear way to bring these scattered pieces of information together so opportunities and deadlines are easy to understand.
- Development: Build a prototype that turns unstructured notifications into organized and searchable opportunities.

## Solution Summary

Track Unity solves this problem with a 3-layer system:

1. Frontend dashboard for users to add, view, track, and prioritize opportunities.
2. Backend APIs for ingestion, parsing orchestration, persistence, reminders, and application-state tracking.
3. NLP service for extracting structured data from unstructured text.

Core outcomes:

- Converts noisy text/image content into structured opportunity data.
- Stores opportunities with confidence, risk, and link status.
- Tracks user action states: not_applied, clicked_apply, applied.
- Sends recurring reminders for pending applications.
- Ranks opportunities by nearest deadlines for priority handling.

## Tech Stack

### Frontend

- React 19: Component-based UI.
- Vite: Fast dev/build pipeline.
- Tailwind CSS + tailwindcss-animate: Styling and UI motion utilities.
- Framer Motion: Animations and transitions.
- Axios: API communication with auth interceptors.
- React Router: Route protection and navigation.
- Lucide React: Icon system.

### Backend

- Node.js + Express: REST API server.
- MongoDB Atlas + Mongoose: Data storage and schema modeling.
- JWT + bcryptjs: Secure authentication.
- node-cron: Scheduled jobs (hourly reminders and polling).
- node-telegram-bot-api: Telegram bot ingestion.
- Multer: Image upload processing.
- Tesseract.js (+ optional OpenCV): OCR extraction from posters/screenshots.
- imapflow + mailparser: Email parsing pipeline.
- Axios + validator: Service calls and URL validation support.

### NLP Service

- FastAPI + Uvicorn: Python microservice API.
- spaCy: Entity and text analysis.
- sentence-transformers + scikit-learn: Similarity-based recommendation matching.
- BeautifulSoup + validators + requests: Text cleanup and utility processing.

## Architecture Overview

```text
User Input Sources
  |- Dashboard text paste
  |- Dashboard image upload
  |- Telegram bot messages/photos
  |- Email inbox (IMAP polling)
        |
        v
Backend Ingestion Layer (Express)
  |- OCR (image)
  |- NLP extraction call
  |- Link validation
  |- Risk scoring
  |- Dedupe and persistence
        |
        v
MongoDB
  |- Opportunities
  |- Raw messages
  |- User profiles
  |- Recommendations
  |- Notifications
        |
        v
Dashboard Experience (React)
  |- Opportunity feed
  |- Deadline tracker
  |- Priority opportunities
  |- Recommendations
  |- Application status workflow
```

## Simple Architecture (Easy View)

### Who does what

- User: Adds opportunities and tracks application progress.
- Frontend (React): Shows dashboard, cards, deadlines, priority, and recommendations.
- Backend (Node/Express): Handles APIs, ingestion logic, reminders, and status updates.
- NLP Service (FastAPI): Extracts structured data from raw text.
- MongoDB: Stores users, profiles, opportunities, notifications, and recommendations.
- Telegram and Email: External source channels that feed opportunities into backend.

### High-level flow

1. User action comes from Dashboard, Telegram, or Email.
2. Backend receives raw content.
3. Backend extracts text (OCR when image).
4. Backend sends text to NLP service.
5. NLP returns structured fields.
6. Backend validates link, computes risk, removes duplicates.
7. Backend saves data in MongoDB.
8. Frontend fetches and displays feed, priority list, and reminders.

## Simple Data Flow (Step-by-Step)

### A) Opportunity ingestion flow

1. User pastes text or uploads image.
2. Frontend calls backend ingest API.
3. Backend runs OCR if image.
4. Backend calls NLP `/extract`.
5. Backend enriches data (linkStatus, risk, confidence).
6. Backend stores `RawMessage` + `Opportunity`.
7. Frontend gets response and shows new opportunity card.

### B) Application tracking flow

1. User clicks Apply button.
2. Frontend calls `click-apply` API.
3. Backend sets `applicationStatus = clicked_apply`.
4. User completes external form and confirms.
5. Frontend calls `mark-applied` API.
6. Backend sets `applicationStatus = applied` and stops further reminders for that opportunity.

### C) Reminder and priority flow

1. Hourly scheduler runs in backend.
2. It checks all non-applied opportunities.
3. It computes `priorityRank` using nearest deadline.
4. It creates reminder notifications.
5. Frontend reads updated priority/deadline data and shows urgency widgets.

## Project Structure

```text
Track_Unity/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── extractController.js
│   │   ├── ingestionController.js
│   │   ├── opportunityController.js
│   │   ├── profileController.js
│   │   └── recommendationController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Notification.js
│   │   ├── Opportunity.js
│   │   ├── OpportunityRecommendation.js
│   │   ├── RawMessage.js
│   │   ├── User.js
│   │   └── UserProfile.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── ingestionRoutes.js
│   │   ├── opportunityRoutes.js
│   │   ├── profileRoutes.js
│   │   └── recommendationRoutes.js
│   ├── services/
│   │   ├── emailParser.js
│   │   ├── fakeDetector.js
│   │   ├── hourlyReminderEngine.js
│   │   ├── linkValidator.js
│   │   ├── nlpClientService.js
│   │   ├── nlpParserService.js
│   │   ├── ocrService.js
│   │   ├── opportunityParser.js
│   │   ├── recommendationService.js
│   │   ├── reminderService.js
│   │   └── telegramBotService.js
│   ├── uploads/
│   ├── .env
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
└── services/
    └── nlp_service/
        ├── main.py
        ├── requirements.txt
        ├── skills_db.json
        └── README.md
```

## Module-by-Module Explanation

## Backend Modules

### Controllers

- authController.js: Handles register and login endpoints; returns JWT.
- profileController.js: Saves onboarding profile, reads current profile, updates profile.
- ingestionController.js: Main ingestion orchestrator for text/image/telegram data; performs extraction pipeline and database persistence.
- opportunityController.js: CRUD for opportunities, link re-validation, click-apply/mark-applied actions, and priority list endpoint.
- dashboardController.js: Returns summary metrics and recent/upcoming data for dashboard widgets.
- recommendationController.js: Fetches recommendation records for logged-in user.
- extractController.js: Supports extraction-related endpoint logic.

### Services

- nlpClientService.js: Calls Python NLP service endpoints.
- nlpParserService.js and opportunityParser.js: Normalizes parsed response into platform format.
- ocrService.js: Extracts text from uploaded images.
- linkValidator.js: Checks and classifies application links as valid/suspicious/broken.
- fakeDetector.js: Computes risk signals from extracted content.
- recommendationService.js: Skill-match and recommendation persistence logic.
- reminderService.js: Daily deadline reminders based on configured windows.
- hourlyReminderEngine.js: Hourly reminders for non-applied opportunities and priorityRank updates.
- telegramBotService.js: Telegram bot runtime (polling/webhook), image handling, and forwarding to backend.
- emailParser.js: IMAP unread email polling and ingestion into raw/opportunity models.

### Models

- User: Account identity and auth fields.
- UserProfile: Onboarding preferences, skills, and profile metadata.
- RawMessage: Stores unstructured source data before/after processing.
- Opportunity: Structured opportunity record with application tracking fields.
- Notification: Reminder/system notifications.
- OpportunityRecommendation: User-opportunity match results.

### Middleware

- authMiddleware.js and auth.js: JWT token verification and route protection.
- errorHandler.js: Centralized API error formatting and status mapping.

## Frontend Modules

### Pages

- LandingPage: Marketing and product overview.
- LoginPage/RegisterPage: Authentication UI.
- OnboardingPage: Initial profile and skills capture.
- DashboardPage: Main user workspace combining all widgets.

### Core Dashboard Components

- OpportunityFeed: Lists all opportunities.
- OpportunityCard: Displays extracted details, link status, confidence, and application action state.
- QuickAddOpportunity: Text ingestion from dashboard.
- ImageUpload: Poster/screenshot upload flow.
- DeadlineTracker: Upcoming deadlines with urgency indicators.
- PriorityOpportunities: Nearest deadline list for action prioritization.
- NotificationsPanel: Deadline-based alert panel.
- RecommendationPanel: Personalized recommendation display.
- StatsCards and AdvancedStats: Summary metrics and activity stats.
- ProtectedRoute: Guards private pages.
- ThemeToggle: Light/dark switch.

### Frontend Service Layer

- api.js: Axios base config, token injection, and response interceptors.
- authApi.js: Register/login API wrappers.
- profileApi.js: Onboarding/profile API wrappers.
- opportunityApi.js: Opportunity list, ingestion, apply status, and priority API wrappers.
- dashboardApi.js: Dashboard summary API wrapper.
- recommendationApi.js: Recommendation API wrapper.

## NLP Service Modules

- main.py:
  - GET /health: Service status check.
  - POST /extract: Converts raw text into structured opportunity fields.
  - POST /recommend-match: Computes eligibility, similarity, and matched/missing skills.
- skills_db.json: Canonical skill vocabulary used during extraction.

## Key Workflows

### Workflow 1: Unstructured Message to Structured Card

1. User sends/pastes text or uploads an image (or Telegram/email source feeds data).
2. Backend extracts text (OCR when needed).
3. Backend calls NLP service /extract.
4. Parsed data is enriched with link status and risk scoring.
5. Opportunity is saved and shown in dashboard feed.

### Workflow 2: Application Tracking

1. Default status: not_applied.
2. User clicks Apply: status changes to clicked_apply with timestamp.
3. User confirms completion: status changes to applied with timestamp.
4. applied opportunities stop reminder generation.

### Workflow 3: Priority and Reminder Engine

1. Hourly cron scans non-applied opportunities.
2. priorityRank is updated from time remaining to deadline.
3. Reminder notifications are created for pending applications.
4. Dashboard priority/deadline widgets show what needs immediate action.

## API Endpoints

### Auth

- POST /api/auth/register
- POST /api/auth/login

### Profile

- POST /api/profile/onboarding
- GET /api/profile/me
- PUT /api/profile/update

### Ingestion

- POST /api/ingest/text
- POST /api/ingest/image
- POST /api/ingest/telegram

### Opportunities

- GET /api/opportunities
- GET /api/opportunities/priority
- GET /api/opportunities/:id
- DELETE /api/opportunities/:id
- PATCH /api/opportunities/:id/revalidate-link
- POST /api/opportunities/:id/click-apply
- POST /api/opportunities/:id/mark-applied

### Dashboard and Recommendation

- GET /api/dashboard
- GET /api/recommendations

### NLP Service

- GET /health
- POST /extract
- POST /recommend-match


## Final Outcome

Track Unity turns fragmented opportunity notifications into a unified, intelligent workflow where students can:

- Capture opportunities from anywhere.
- Understand eligibility/deadlines quickly.
- Prioritize by urgency.
- Track application progress.
- Receive timely reminders until completion.

This directly addresses the core challenge in the problem statement: reducing time lost in message threads and increasing actionable visibility.
