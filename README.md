# 2LIES1TRUTH - Realtime Party Game

An interactive, synchronous real-time party game inspired by the famous "Two Truths and a Lie" icebreaker. This project leverages **React (Vite + TypeScript)** on the front-end and **Supabase** on the back-end to manage game states, scores, and instant voting mechanics via WebSockets (PostgreSQL Realtime).


## Prerequisites

Before setting up the project locally, ensure you have the following:
- [Node.js](https://nodejs.org/) (Version 18 or superior)
- **npm** (comes bundled with Node.js)
- A free [Supabase](https://supabase.com/) account

---

## Step-by-Step Local Setup

### 1. Clone the Repository
Open your terminal and execute the following commands to download the project:
```bash
git clone git@github.com:artmear/2Lies1Truth.git
cd 2LIES1TRUTH
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Database (Supabase)

#### 1. Create a new project in your Supabase dashboard.
#### 2. Navigate to the SQL Editor tab on the left sidebar.
#### 3. Paste and execute the database schema script to structure the tables and enable the real-time publication engine

```bash
cat ./database/setup.sql | xclip -selection clipboard
```

### 4. Environment Variables

Create a file named .env in your project's absolute root directory (at the same level as package.json) and append your Supabase credentials and conductor's password (just create a new password):

```bash
VITE_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
VITE_SUPABASE_ANON_KEY=your-public-anon-key-here
VITE_ADMIN_PASSWORD=<admin-password>
```

## How to Run and Test

### Local Network Mode (Playing with Real Smartphones)

To expose your Vite server to your local Wi-Fi network and allow physical mobile devices to join the session:

1. Inside src/views/conductor/LobbyView.tsx, ensure you gameUrl swap out for your machine's exact internal local network IP address during local testing.
2. The network URL should appear after the following command:
```bash
npm run dev -- --host
```

## Tech Stack

**Front-End:** React 18, Vite, TypeScript

**Back-End & Realtime Infrastructure:** Supabase (PostgreSQL + WebSockets)

**Dependencies:** qrcode.react (Dynamic SVG QR code generation)