# Mock Competitive Programming API — README

A lightweight, in-memory REST API for a competitive programming platform. It covers user auth (JWT), contests, problems, submissions, and a demo leaderboard.

## Index

- [How to Run](#how-to-run)
  - [Run Locally](#run-locally)
  - [Run on GitHub Codespaces](#run-on-github-codespaces)
- [API Overview](#api-overview)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Contests](#contests)
  - [Problems](#problems)
  - [Submissions](#submissions)
  - [Root](#root)
  - [CORS](#cors)
- [Data Models (Conceptual)](#data-models-conceptual)
- [Notes & Known Quirks](#notes--known-quirks)
- [Tech Stack](#tech-stack)

---

## How to Run

### Run Locally

**Prerequisites**
- Node.js and npm installed (`node -v`, `npm -v`)

**Steps**
1. Download the `app.js` file and create a new directory for your project:
   ```bash
   mkdir cp-api
   cd cp-api
   ```
   Place `app.js` in this directory.
2. Initialize the project:
   ```bash
   npm init -y
   ```
3. Install dependencies:
   ```bash
   npm install express cors jsonwebtoken
   ```
5. Start the server:
   ```bash
   npm start
   # or, 
   node app.js
   ```
6. Open `http://localhost:3000/` in a browser to verify the welcome JSON message.

**Notes**
- Data is stored in memory; restarting the server clears all data.
- The JWT secret is hardcoded in this mock; no `.env` is required for basic usage.

---

### Run on GitHub Codespaces (Fork → Codespace)

**Steps**
1. Fork the repository to your GitHub account.
2. In your fork, click **Code → Codespaces → Create codespace on main**.
3. When the Codespace opens, install and run:
   ```bash
   # If package.json exists:
   npm install
   npm start

   # If package.json doesn\'t exist yet:
   npm init -y
   npm install express cors jsonwebtoken
   npm start # or node app.js
   ```
4. Open the forwarded port:
   - The app listens on **port 3000**. Codespaces auto-detects it in the **Ports** panel.
   - Click the forwarded **3000** URL to open the API.
   - Set the port **Visibility** to **Public** if you are testing with postman web versions or similar tools.
5. You can now access the API at `https://<your-codespace-name>-3000.<your-github-username>.preview.app.github.dev/`. 


## API Overview

### Authentication

- Header: `Authorization: Bearer <JWT>`
- Tokens are issued by `POST /auth/login` and expire in **1 hour**.
- Protected routes respond with `401` if the token is missing/invalid.

**Routes**
- `POST /auth/register` — Create a new user.
- `POST /auth/login` — Obtain a JWT.
- `GET /auth/profile` — Get the authenticated user’s profile. *(auth required)*

### Users

- `GET /users` — List users (supports `sortBy`, `order`).
- `GET /users/:id` — Get a user by id.
- `PUT /users/:id` — Update your own profile. *(auth required; token subject must match `:id`)*
- `GET /users/:id/contests` — Contests a user has joined.
- `GET /users/:id/submissions` — Submissions made by the user.
- `GET /users/:id/rating` — The user’s rating.

### Contests

- `GET /contests` — List contests (supports `sortBy`, `order`).
- `GET /contests/upcoming` — List future contests.
- `GET /contests/:id` — Details.  
- `POST /contests` — Create a contest; `setter` is taken from token. *(auth required)*
- `POST /contests/problems` — Add a problem to a contest. *(auth required; only setter)*
- `GET /contests/:id/problems` — List problems of a contest. *(blocked for upcoming contests)*
- `GET /contests/:id/participants` — List participants. *(blocked for upcoming contests)*
- `POST /contests/:id/join` — Join a contest (cannot join your own; cannot join if already ended). *(auth required)*
- `GET /contests/:id/leaderboard` — Demo leaderboard with random points.
- `GET /contests/:id/participation/:userId` — Participation summary for a user (requires leaderboard to be generated).

### Problems

- `GET /problems` — List problems from **past** contests (where `dateTime` < now).
- `GET /problems/:id` — Get a problem details by id (should not include problems from upcoming contests).
- `PUT /problems/:id` — Update a problem.
- `GET /problems/:id/submissions` — List submissions for a problem.

### Submissions

- `POST /problems/:id/submit` — Submit a solution. *(auth required)*  
- `GET /submissions` — List all submissions (basic info; supports `sortBy`, `order`).
- `GET /submissions/:id` — Get a submission only if you are the owner. *(auth required)*

### Root

- `GET /` — Health/info.

---

## Data Models (Conceptual)

> The server stores data **in memory** (arrays). Data resets on restart.

**User**
```ts
{
  id: number,
  username: string,
  password: string,           // plain in this mock
  email: string | null,
  dateOfBirth: string | null, // e.g., "1999-04-30"
  country: string | null,
  organization: string | null,
  rating: number              // default 1500
}
```

**Contest**
```ts
{
  id: number,
  name: string,
  dateTime: string,        // ISO start time, N.B. Some responses use `date` instead
  duration: number,        // minutes
  problems: number[],      // problem ids
  participants: number[],  // user ids
  setter: string           // creator username
  // NOTE: some responses use `date` instead of `dateTime`
}
```

**Problem**
```ts
{
  id: number,
  name: string,
  description: string,
  input: string,
  output: string,
  category: string,     // e.g., "math", "dp"
  difficulty: string,   // "easy" | "medium" | "hard"
  timelimit: string,    // e.g., "1s"
  contestId: number
}
```

**Submission**
```ts
{
  id: number,
  problemId: number,
  userId: number | string,   // see quirks about type inconsistency
  contestId: number | null,
  code: string,
  verdict: "Accepted" | "Rejected",
  runtime: string,           // e.g., "123ms"
  memory: string,            // e.g., "64KB"
  timestamp: string          // ISO time
}
```

---
## Endpoint Reference (Details + Examples)

> **Formatting note:** Examples below show JSON bodies and responses. No cURL or REST client commands are included.

### Auth Endpoints

#### POST `/auth/register`
Create a new user.

**Auth**: Not required  
**Headers**: `Content-Type: application/json`  
**Body (JSON)**:
```json
{
  "username": "alice",
  "password": "secret",
  "email": "alice@example.com",
  "dateOfBirth": "2001-01-01",
  "country": "BD",
  "organization": "UIU"
}
```
**Success (201)**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "dateOfBirth": "2001-01-01",
    "country": "BD",
    "organization": "UIU",
    "rating": 1500
  }
}
```
**Errors**:
- 400 — `{"message":"Username and password are required"}`  
- 400 — `{"message":"Username already exists"}`

---

#### POST `/auth/login`
Obtain a JWT.

**Auth**: Not required  
**Headers**: `Content-Type: application/json`  
**Body (JSON)**:
```json
{ "username": "alice", "password": "secret" }
```
**Success (200)**:
```json
{ "token": "<JWT>", "message": "Login successful" }
```
**Errors**:
- 400 — `{"message":"Username and password are required"}`  
- 401 — `{"message":"Invalid credentials"}`

---

#### GET `/auth/profile`
Get the logged-in user’s profile.

**Auth**: Required (`Authorization: Bearer <JWT>`)  
**Success (200)**:
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "dateOfBirth": "2001-01-01",
  "country": "BD",
  "organization": "UIU",
  "rating": 1500
}
```
**Errors**:
- 401 — `{"message":"No token provided"}` / `{"message":"Invalid token"}` / `{"message":"Token expired"}`  
- 404 — `{"message":"User not found"}`

---

### User Endpoints

#### GET `/users`
List users (basic info).

**Auth**: Not required  
**Query**: `sortBy` (e.g., `username`, `rating`), `order` (`asc`|`desc`)  
**Success (200)**:
```json
[
  {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "dateOfBirth": "2001-01-01",
    "country": "BD",
    "organization": "UIU",
    "rating": 1500
  }
]
```

---

#### GET `/users/:id`
Fetch a single user.

**Auth**: Not required  
**Success (200)**:
```json
{ "id": 1, "username": "alice", "country": "BD", "organization": "UIU", "rating": 1500 }
```
**Errors**:
- 404 — `{"message":"User not found"}`

---

#### PUT `/users/:id`
Update **your own** profile. Token subject (`sub`) must match `:id`.

**Auth**: Required (`Authorization: Bearer <JWT>`)  
**Headers**: `Content-Type: application/json`  
**Body (JSON)** (all optional):
```json
{
  "username": "alice2",
  "email": "alice2@example.com",
  "dateOfBirth": "2000-12-31",
  "country": "BD",
  "organization": "UIU"
}
```
**Success (200)**:
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "username": "alice2",
    "email": "alice2@example.com",
    "dateOfBirth": "2000-12-31",
    "country": "BD",
    "organization": "UIU",
    "rating": 1500
  }
}
```
**Errors**:
- 401 — `{"message":"No token provided"}` / `{"message":"Invalid token"}`  
- 403 — `{"message":"You can only update your own profile"}`  
- 404 — `{"message":"User not found"}`

---

#### GET `/users/:id/contests`
Contests a user has joined.

**Auth**: Not required  
**Success (200)**:
```json
{
  "contests": [
    { "id": 1, "name": "July Lunchtime", "date": "2025-07-10T15:00:00Z", "duration": 120, "problems": 4 }
  ]
}
```
**Errors**:
- 404 — `{"message":"User not found"}`

---

#### GET `/users/:id/submissions`
All submissions by the user.

**Auth**: Not required  
**Success (200)**:
```json
{
  "submissions": [
    { "id": 1, "problemId": 3, "contestId": 1, "verdict": "Accepted", "timestamp": "2025-08-01T10:05:00.000Z" }
  ]
}
```
**Errors**:
- 404 — `{"message":"User not found"}`

---

#### GET `/users/:id/rating`
The user’s rating.

**Auth**: Not required  
**Success (200)**:
```json
{ "id": 1, "username": "alice", "rating": 1500 }
```
**Errors**:
- 404 — `{"message":"User not found"}`

---

### Contest Endpoints

#### GET `/contests`
List contests.

**Auth**: Not required  
**Query**: `sortBy` (e.g., `name`, `duration`), `order` (`asc`|`desc`)  
**Success (200)**:
```json
[
  { "id": 1, "name": "July Lunchtime", "date": "2025-07-10T15:00:00Z", "duration": 120, "problems": 4 }
]
```
> **Note:** Response uses `date` (not `dateTime`).

---

#### GET `/contests/upcoming`
List contests with start time in the future.

**Auth**: Not required  
**Success (200)**:
```json
[
  { "id": 2, "name": "August Long", "date": "2025-08-20T14:00:00Z", "duration": 180 }
]
```
> **Note:** Response uses `date` (not `dateTime`).

---

#### GET `/contests/:id`
Contest details.

**Auth**: Not required (but behavior changes if you are the setter)  
**Behavior**:
- If **upcoming** and your token username equals the **setter**, full details are returned.
- If **upcoming** and you are **not** the setter, `400` is returned.
- If **past**, details are returned without `setter`.

**Success (200, upcoming & setter)**:
```json
{
  "id": 1,
  "name": "July Lunchtime",
  "date": "2025-07-10T15:00:00Z",
  "duration": 120,
  "problems": 4,
  "participants": 12,
  "setter": "alice"
}
```
**Success (200, past)**:
```json
{
  "id": 1,
  "name": "July Lunchtime",
  "date": "2025-07-10T15:00:00Z",
  "duration": 120,
  "problems": 4,
  "participants": 12
}
```
**Errors**:
- 404 — `{"message":"Contest not found"}`  
- 400 — `{"message":"Contest is upcoming or you are not authorized to see the details yet"}`

---

#### POST `/contests`
Create a contest. The `setter` is taken from the token’s username.

**Auth**: Required (`Authorization: Bearer <JWT>`)  
**Headers**: `Content-Type: application/json`  
**Body (JSON)**:
```json
{ "name": "August Long", "dateTime": "2025-08-20T14:00:00Z", "duration": 180 }
```
**Success (201)**:
```json
{
  "message": "Contest created successfully",
  "contest": {
    "id": 2,
    "name": "August Long",
    "date": "2025-08-20T14:00:00Z",
    "duration": 180,
    "problems": 0,
    "participants": 0,
    "setter": "alice"
  }
}
```
**Errors**:
- 401 — `{"message":"No token provided"}` / `{"message":"Invalid token"}`  
- 400 — `{"message":"Name, dateTime, and duration are required"}`

---

#### POST `/contests/problems`
Add a problem to a contest (**only the setter can add**).

**Auth**: Required (`Authorization: Bearer <JWT>`)  
**Headers**: `Content-Type: application/json`  
**Body (JSON)** (all required):
```json
{
  "contestId": 2,
  "problemName": "Two Sum",
  "problemDescription": "Given an array ...",
  "problemInput": "n\\narr\\nk",
  "problemOutput": "i j",
  "category": "array",
  "difficulty": "easy",
  "timelimit": "1s"
}
```
**Success (201)**:
```json
{
  "message": "Problem added to contest successfully",
  "problem": {
    "id": 1,
    "name": "Two Sum",
    "description": "Given an array ...",
    "input": "n\\narr\\nk",
    "output": "i j",
    "category": "array",
    "difficulty": "easy",
    "timelimit": "1s",
    "contestId": 2
  }
}
```
**Errors**:
- 401 — `{"message":"No token provided"}` / `{"message":"Invalid token"}`  
- 403 — `{"message":"You are not allowed to add problems to this contest"}`  
- 404 — `{"message":"Contest not found"}`  
- 400 — `{"message":"Problem details(name, description, input, output, category, difficulty, timelimit) are required"}`

---

#### GET `/contests/:id/problems`
List problems of a contest.

**Auth**: Not required  
**Success (200)**:
```json
{
  "contestId": 2,
  "problems": [
    { "id": 1, "name": "Two Sum", "category": "array", "timelimit": "1s" }
  ]
}
```
**Errors**:
- 404 — `{"message":"Contest not found"}`  
- 400 — `{"message":"Contest is upcoming, problems are not available yet"}`

---

#### GET `/contests/:id/participants`
List participants (user IDs & usernames).

**Auth**: Not required  
**Success (200)**:
```json
{
  "contestId": 2,
  "participants": [
    { "id": 1, "username": "alice" }
  ]
}
```
**Errors**:
- 404 — `{"message":"Contest not found"}`  
- 400 — `{"message":"Contest is upcoming, participants are not available yet"}`

---

#### POST `/contests/:id/join`
Join a contest (cannot join your own; cannot join if ended).

**Auth**: Required (`Authorization: Bearer <JWT>`)  
**Success (200)**:
```json
{ "message": "User alice joined contest 2", "contestId": 2 }
```
**Errors**:
- 401 — `{"message":"No token provided"}` / `{"message":"Invalid token"}`  
- 404 — `{"message":"User not found"}` / `{"message":"Contest not found"}`  
- 400 — `{"message":"You cannot join your own contest"}`  
- 400 — `{"message":"Contest has already ended"}`  
- 400 — `{"message":"You have already joined this contest"}`

---

#### GET `/contests/:id/leaderboard`
Returns a **mock** leaderboard with random points for the contest’s participants.

**Auth**: Not required  
**Success (200)**:
```json
{
  "contestId": 2,
  "leaderboard": [
    { "userId": 3, "username": "bob", "points": 87, "rank": 1 },
    { "userId": 1, "username": "alice", "points": 65, "rank": 2 }
  ]
}
```
**Errors**:
- 404 — `{"message":"Contest not found"}`

---

#### GET `/contests/:id/participation/:userId`
Participation summary for one user in a contest.

**Auth**: Not required  
**Success (200)**:
```json
{
  "contestId": 2,
  "userId": 1,
  "username": "alice",
  "hasParticipated": true,
  "leaderboard": { "userId": 1, "username": "alice", "points": 65, "rank": 2 }
}
```
**Errors**:
- 404 — `{"message":"Contest not found"}` / `{"message":"User not found"}`  
- 400 — `{"message":"Contest leaderboard is not available yet"}`

---

### Problem Endpoints

#### GET `/problems`
List **all problems from past contests** (`contest.dateTime` < now).

**Auth**: Not required  
**Query**: `sortBy` (e.g., `name`, `difficulty`), `order` (`asc`|`desc`)  
**Success (200)**:
```json
[
  { "id": 1, "name": "Two Sum", "category": "array", "difficulty": "easy", "timelimit": "1s" }
]
```

---

#### GET `/problems/:id`
Get a problem by id.

**Auth**: Not required  
**Success (200)**:
```json
{
  "id": 1,
  "name": "Two Sum",
  "description": "Given an array ...",
  "input": "n\\narr\\nk",
  "output": "i j",
  "category": "array",
  "difficulty": "easy",
  "timelimit": "1s"
}
```
**Errors**:
- 404 — `{"message":"Problem not found"}`

> **Note:** This endpoint is defined twice in code; behavior is identical.

---

#### PUT `/problems/:id`
Update a problem.

**Auth**: Not required (demo)  
**Headers**: `Content-Type: application/json`  
**Body (JSON)** (any subset):
```json
{ "name": "Two Sum (Updated)", "timelimit": "2s" }
```
**Success (200)**:
```json
{
  "message": "Problem updated successfully",
  "problem": {
    "id": 1,
    "name": "Two Sum (Updated)",
    "description": "Given an array ...",
    "input": "n\\narr\\nk",
    "output": "i j",
    "category": "array",
    "difficulty": "easy",
    "timelimit": "2s"
  }
}
```
**Errors**:
- 404 — `{"message":"Problem not found"}`

---

#### GET `/problems/:id/submissions`
Submissions for a problem.

**Auth**: Not required  
**Success (200)**:
```json
{
  "problemId": 1,
  "submissions": [
    { "id": 3, "userId": 1, "contestId": 2, "verdict": "Accepted", "timestamp": "2025-08-01T10:05:00.000Z" }
  ]
}
```
**Errors**:
- 404 — `{"message":"Problem not found"}`

---

### Submission Endpoints

#### POST `/problems/:id/submit`
Submit a solution to a problem.

**Auth**: Required (`Authorization: Bearer <JWT>`)  
**Headers**: `Content-Type: application/json`  
**Body (JSON)**:
```json
{
  "problemId": 1,
  "code": "print('hello')"
}
```
**Success (201)**:
```json
{
  "message": "Submission successful",
  "submission": {
    "id": 1,
    "problemId": 1,
    "userId": "alice",
    "contestId": 2,
    "verdict": "Accepted",
    "runtime": "321ms",
    "memory": "42KB",
    "timestamp": "2025-08-01T10:05:00.000Z"
  }
}
```
**Errors**:
- 404 — `{"message":"Problem not found"}`  
- 400 — `{"message":"Problem ID and code are required"}`  
- 401 — `{"message":"Unauthorized"}` (missing/invalid token)  
- 400 — `{"message":"Contest is upcoming, submissions are not allowed yet"}`  
- 403 — `{"message":"You are not a participant in this contest"}`

> **Behavior note:** The handler sets `userId` from the token **username** (string). See [Notes & Known Quirks](#notes--known-quirks).

---

### Root

#### GET `/`
Health/info  
**Success (200)**:
```json
{ "message": "Welcome to the Mock Competitive Programming API" }
```

---


## Notes & Known Quirks

- Some contest responses use `date` while the internal model uses `dateTime`. Treat both as the ISO start time.
- Leaderboard points are random on each call; intended for demo only.
- Passwords are not hashed in this mock; do not use in production.
- Ownership/participant checks are based on token-derived values and in-memory arrays. In production you should:
  - store numeric `userId` in the JWT (`sub`) and reference consistently,
  - hash passwords,
  - validate request bodies,
  - normalize property names (prefer always `dateTime`).
- **Type mismatch**: `getUsernameFromToken` returns a username string, but contest participants are numeric user IDs. Adjust logic if you extend this mock.
- **Property mismatch in submission handler**: references `problem.contestID` (capital D) while problems store `contestId`. Align these if you adapt the code.

---

