# Cloudflare CMS API - Project Setup

## Overview

This is a multi-site content management system API built on Cloudflare Workers with D1, R2, and KV.

## Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:8787`

## Database

### Generate migrations

```bash
npm run db:generate
```

### Apply migrations (local)

```bash
npm run db:migrate
```

### Open Drizzle Studio

```bash
npm run db:studio
```

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Deployment

### Staging

```bash
npm run deploy:staging
```

### Production

```bash
npm run deploy:production
```

## Project Structure

```
src/
├── index.ts              # Main application entry
├── db/
│   └── schema.ts         # Database schema definitions
├── types/
│   └── index.ts          # TypeScript type definitions
├── middleware/
│   ├── auth.ts           # Authentication middleware
│   ├── site.ts           # Site isolation middleware
│   ├── audit.ts          # Audit logging middleware
│   └── errorHandler.ts   # Error handling middleware
├── services/
│   ├── userService.ts
│   ├── articleService.ts
│   ├── channelService.ts
│   ├── dictionaryService.ts
│   ├── promoService.ts
│   ├── auditLogService.ts
│   ├── imageUploadService.ts
│   └── cacheManager.ts
├── routes/
│   ├── users.ts
│   ├── articles.ts
│   ├── channels.ts
│   ├── dictionaries.ts
│   ├── promos.ts
│   └── images.ts
├── utils/
│   ├── response.ts       # Response formatting
│   ├── password.ts       # Password hashing
│   ├── jwt.ts            # JWT utilities
│   ├── authorization.ts  # Role-based authorization
│   ├── queryBuilder.ts   # Query builder
│   ├── pagination.ts     # Pagination utilities
│   └── validation.ts     # Input validation
└── errors/
    └── index.ts          # Custom error classes
```

## Environment Variables

Create a `.dev.vars` file for local development:

```
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=7d
```

For production, set these as secrets in Cloudflare:

```bash
wrangler secret put JWT_SECRET
wrangler secret put JWT_EXPIRATION
```

## API Endpoints

All endpoints are prefixed with `/api/v1/`

### Health Check
- `GET /health` - Service health status

### Authentication
- `POST /api/v1/auth/login` - User login

### Users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - List users
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Articles
- `POST /api/v1/articles` - Create article
- `GET /api/v1/articles` - List articles
- `GET /api/v1/articles/:id` - Get article
- `PUT /api/v1/articles/:id` - Update article
- `DELETE /api/v1/articles/:id` - Delete article

### Channels
- `POST /api/v1/channels` - Create channel
- `GET /api/v1/channels/tree` - Get channel tree
- `PUT /api/v1/channels/:id` - Update channel
- `DELETE /api/v1/channels/:id` - Delete channel

### Dictionaries
- `POST /api/v1/dictionaries` - Create dictionary entry
- `GET /api/v1/dictionaries` - List dictionary entries
- `PUT /api/v1/dictionaries/:id` - Update dictionary entry
- `DELETE /api/v1/dictionaries/:id` - Delete dictionary entry

### Promos
- `POST /api/v1/promos` - Create promo
- `GET /api/v1/promos/active` - Get active promos
- `PUT /api/v1/promos/:id` - Update promo
- `PUT /api/v1/promos/:id/toggle` - Toggle promo status
- `DELETE /api/v1/promos/:id` - Delete promo

### Images
- `POST /api/v1/images/upload` - Upload image

## Authentication

All protected endpoints require:
- `Authorization: Bearer <JWT_TOKEN>` header
- `Site-Id: <SITE_ID>` header

## License

ISC
