# Finance Tracker API (Express + MongoDB + JWT)

Full backend for the Pocketly-style finance tracker using Express, MongoDB (via mongoose), JWT auth, and an MVC structure.

## Setup

1. Install dependencies:

```bash
cd c:\Users\sujjo\OneDrive\Desktop\ipd
npm install
```

2. Create `.env` in the project root (next to `index.html`):

```bash
MONGO_URI=mongodb://localhost:27017/pocketly
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
PORT=5050
```

3. Run the API:

```bash
npm run dev:api
```

API will start on **`http://127.0.0.1:5050`** (or your `PORT`).

## Main endpoints

### Health
- `GET /api/health`

### Auth
- `POST /api/auth/register` – body: `{ "email", "name", "password" }`
- `POST /api/auth/login` – body: `{ "email", "password" }`

Responses include `token` and `user`. Use the token as:

```http
Authorization: Bearer <token>
```

### Categories (JWT required)
- `GET /api/categories`
- `POST /api/categories`
- `GET /api/categories/:id`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

Body example for create:

```json
{ "name": "Food", "icon": "🍔", "color": "#22c55e" }
```

### Transactions (JWT required)
- `GET /api/transactions`
  - filters: `categoryId`, `type=income|expense`, `from`, `to`
  - paging: `limit`, `offset`
- `POST /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/transactions/summary`

Body example for create:

```json
{
  "amount": 140,
  "type": "expense",
  "categoryId": "<CATEGORY_ID>",
  "note": "Café Latte",
  "occurredAt": "2026-03-19T10:12:00.000Z"
}
```

