# MailClean

A powerful Gmail inbox management tool built with Next.js 15, helping users clean their inbox by identifying bulk senders and deleting unwanted emails.

## Features

- 🔍 **Smart Inbox Scanning** - Analyze your Gmail inbox and identify bulk senders
- 📊 **Sender Statistics** - View detailed stats for each sender (email count, last received date)
- 🗑️ **Bulk Delete** - Remove all emails from specific senders with one click
- 📧 **Unsubscribe Detection** - Automatically detect and access unsubscribe links
- ⚡ **Rate Limiting** - Intelligent Gmail API rate limiting with automatic pause/resume
- 🌙 **Dark Mode** - Full dark mode support
- 🔐 **Secure OAuth** - Google OAuth 2.0 authentication
- 💳 **Subscription Plans** - Multiple pricing tiers (Free, Solo, Family, Pro)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **Email**: Resend
- **Styling**: Tailwind CSS
- **API**: Gmail API v1

## Prerequisites

- Node.js 18+ and npm
- Google Cloud Console account
- Stripe account (for payments)
- Resend account (for emails)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mailclean-web.git
cd mailclean-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Database
DATABASE_URL="file:./dev.db"

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Session
SESSION_SECRET=your_random_secret_key

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Resend (optional)
RESEND_API_KEY=your_resend_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Gmail API
4. Configure OAuth consent screen:
   - User type: External
   - Add scopes:
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.metadata`
     - `https://www.googleapis.com/auth/gmail.modify`
5. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`

## Database Schema

The application uses Prisma with SQLite. Main models:

- **User** - User accounts with Google OAuth
- **ScanState** - Gmail scan progress and status
- **SenderStat** - Statistics per email sender
- **ActivityLog** - User action history
- **Subscription** - Stripe subscription data
- **PromoCode** - Promotional codes
- **Team** - Team management for Family/Pro plans

## Project Structure

```
mailclean-web/
├── app/                    # Next.js app directory
│   ├── (app)/             # Protected routes
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── privacy/           # Privacy policy
│   ├── terms/             # Terms of service
│   └── contact/           # Contact page
├── components/            # React components
├── lib/                   # Utility functions
│   ├── gmail-scanner.ts   # Gmail API integration
│   ├── gmail-rate-limiter.ts  # Rate limiting
│   └── prisma.ts          # Database client
├── prisma/               # Database schema
└── public/               # Static assets
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npx prisma studio       # Open Prisma Studio
npx prisma migrate dev  # Run migrations
npx prisma generate     # Generate Prisma client

# Linting
npm run lint            # Run ESLint
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite database path | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | Yes |
| `SESSION_SECRET` | Session encryption key | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `RESEND_API_KEY` | Resend API key | No |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## License

MIT License - see LICENSE file for details

## Support

For support, email support@mailclean.com or open an issue on GitHub.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Security

- OAuth 2.0 for authentication
- HTTPS encryption
- Rate limiting on all API endpoints
- CSRF protection
- Secure session management with iron-session

## Privacy

MailClean respects your privacy:
- We do NOT store email content
- Only metadata (sender, date, count) is stored
- Full GDPR compliance
- You can delete your account anytime

## Roadmap

- [ ] Email templates support
- [ ] Advanced filtering options
- [ ] Email analytics dashboard
- [ ] Mobile app (iOS/Android)
- [ ] Browser extension

---

Built with ❤️ using Next.js
