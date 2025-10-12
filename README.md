[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Deno](https://img.shields.io/badge/Deno-000000?style=for-the-badge&logo=deno&logoColor=white)](https://deno.land/)
[![Clockify](https://img.shields.io/badge/Clockify-03A9F4?style=for-the-badge&logo=clockify&logoColor=white)](https://clockify.me/)
[![Cloudflare Pages](https://img.shields.io/badge/Deployed_on_Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)

# ⏰ WorkSync: Smart Project Pacing & Time Management

WorkSync is an intelligent, multi-tenant dashboard application designed to help freelancers and teams maintain optimal work-life balance and meet project deadlines. It connects directly to your Clockify account to provide daily focus recommendations and monthly pacing alerts based on your allocated hours.

## Key Features

- Daily Focus Calculation: Computes the exact hours you need to log for each project today to ensure you remain on track for your monthly target.

- Smart Suggestions & Pacing Alerts: Provides AI-powered, real-time insights and email alerts if your current time-logging rate projects you to be significantly over or under budget for a project.

- Weekly Summary Emails: Automatically generates and emails a detailed report of the previous week's performance, including peak productivity days and overall monthly status.

- Project History: Visualizes historical weekly summaries for any project, allowing you to track consistency and allocation over time (using Chart.js).

- Monthly Rollover: A one-click process on the Projects page to archive all current projects and start fresh for a new billing cycle.

## 🛠️ Local Development Setup

### Prerequisites

Please ensure you have the following installed:

- Node.js (v18+)

- Angular (v20+)

- Supabase CLI

- Deno (for running Supabase Edge Functions locally)

### Step 1: Clone and Install Dependencies

```
# Clone the repository
git clone <repository-url> worksync
cd worksync

# Install Angular and project dependencies
npm install
```

### Step 2: Configure Supabase Local Environment

The Angular application's environment is configured to connect to a local Supabase instance running via the CLI.

1. Start Supabase services:

   `supabase start`

2. Run Migrations: Apply all the necessary schema changes (including the settings table fix, and the multi-tenancy implementation):

   `supabase migration up`

3. Serve Edge Functions: Serve the local functions so the Angular app can communicate with the backend logic (pacing, suggestions, etc.):

   `supabase functions serve`

### Step 3: Run the Angular Frontend

Open a new terminal window and run the Angular development server:

`ng serve`

The application will be accessible at http://localhost:4200/.
