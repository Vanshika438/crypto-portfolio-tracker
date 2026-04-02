# BlockfolioX — Crypto Portfolio Tracker

A full-stack cryptocurrency portfolio tracker with real-time pricing, P&L analytics, risk & scam detection, tax hints, and exchange integration.

**Tech Stack:** Spring Boot 3.4.1 · React 19 · MySQL 8 · Tailwind CSS · Recharts · Docker

---

## Features

### Dashboard
- Real-time portfolio value with 7-day area chart
- Summary cards — Total Invested, Current Value, P&L, P&L %
- Per-coin expandable sparkline charts
- Live coin prices from CoinGecko API

### Portfolio
- Donut chart showing allocation % per asset
- Top holdings ranked by current value with progress bars
- Bar chart for value distribution across assets
- Full breakdown table with P&L per holding

### Holdings
- Add, edit, and delete crypto assets
- Tracks coin name, quantity, and average buy price
- Total invested shown per asset and overall

### Trades
- Full trade history with BUY/SELL badges
- Manual trade entry (symbol, quantity, price in INR + USD, fees, date)
- Binance sync — pulls real trades via API key or loads demo trades as fallback
- Filter trades by All / Buys / Sells

### P&L Reports
- FIFO realized gains calculation per symbol
- Unrealized gains based on live CoinGecko prices
- Both INR and USD columns throughout
- Live USD/INR exchange rate from exchangerate-api.com
- Export to PDF (browser print dialog with professional layout)
- Export to CSV (6 sections — portfolio summary, holdings, realized gains, trade history, tax summary, per-symbol tax breakdown)

### Tax Hints
- India-specific tax calculation (Section 115BBH)
- 30% flat tax on all realized crypto gains
- 1% TDS on sell transactions above ₹10,000 (Section 194S)
- Per-symbol and per-trade FIFO breakdown
- Net tax after TDS credit
- Tax data included in CSV export

### Risk & Scam Alerts
- Contract verification via Etherscan API
- Honeypot, mintable, proxy, blacklist detection via GoPlus API
- Low market cap and high volatility alerts
- Watchlist management — monitor tokens for risk
- Scheduled scan every 6 hours + manual scan trigger
- Unread alert badge on navbar with auto-refresh every 5 minutes

### Exchange Connection
- Connect Binance via API key (AES/GCM encrypted at rest)
- Connected exchange shown with Active badge, Sync and Remove buttons
- Read-only key enforcement warning

### Profile
- User name, email, member since date

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.4.1 |
| Frontend | React 19, Tailwind CSS, Recharts |
| Database | MySQL 8 |
| Auth | JWT (24hr expiry), BCrypt password hashing |
| Encryption | AES-256/GCM for API keys at rest |
| Pricing | CoinGecko API (5-min cache) |
| Risk | Etherscan API, GoPlus API |
| Exchange Rate | exchangerate-api.com |
| Deployment | Docker, docker-compose |

---

## Project Structure

```
crypto-portfolio-tracker/
├── .env                          # Secrets (never commit)
├── docker-compose.yml            # Full stack orchestration
├── backend/
│   ├── Dockerfile                # Multi-stage Java 17 build
│   └── src/main/java/com/blockfoliox/backend/
│       ├── controller/           # REST controllers
│       ├── model/                # JPA entities
│       ├── repository/           # Spring Data repositories
│       ├── service/              # Business logic
│       ├── security/             # JWT filter, config
│       └── config/               # Data initializer, exception handler
└── frontend/
    └── src/
        ├── api/                  # Axios API calls
        ├── auth/                 # Login/Register page
        ├── components/           # Navbar, ProtectedRoute, Skeleton
        ├── context/              # AuthContext
        └── pages/                # Dashboard, Portfolio, Holdings, Trades, Report, etc.
```

---

## Getting Started

### Option 1 — Docker (Recommended)

**Prerequisites:** Docker Desktop installed and running.

**Step 1 — Clone the repo:**
```bash
git clone https://github.com/Vanshika438/crypto-portfolio-tracker.git
cd crypto-portfolio-tracker
```

**Step 2 — Create `.env` file at project root:**
```env
MYSQL_ROOT_PASSWORD=your_strong_root_password
MYSQL_USER=blockfoliox_user
MYSQL_PASSWORD=your_strong_db_password

DB_URL=jdbc:mysql://db:3306/blockfoliox?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=blockfoliox_user
DB_PASSWORD=your_strong_db_password

JWT_SECRET=your_jwt_secret_min_32_characters_long!!
ENCRYPTION_SECRET=your_exactly_32_char_enc_key!!!!

ETHERSCAN_API_KEY=your_etherscan_api_key

ALLOWED_ORIGINS=http://localhost:3000
REACT_APP_API_URL=http://localhost:8080

DDL_AUTO=update
SHOW_SQL=false
```

**Step 3 — Run everything:**
```bash
docker-compose up --build
```

**Step 4 — Open the app:**
- Frontend → http://localhost:3000
- Backend API → http://localhost:8080

---

### Option 2 — Manual Setup

**Prerequisites:** Java 17+, Node.js 18+, MySQL 8+, Maven 3.9+

**Backend Setup:**

```bash
cd backend
```

Create a MySQL database:
```sql
CREATE DATABASE blockfoliox;
```

Create `src/main/resources/application.properties`:
```properties
server.port=8080
spring.datasource.url=jdbc:mysql://localhost:3306/blockfoliox?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
jwt.secret=your_jwt_secret_min_32_characters_long!!
encryption.secret=your_exactly_32_char_encryption_key
etherscan.api.key=your_etherscan_api_key
allowed.origins=http://localhost:3000
```

Run the backend:
```bash
./mvnw spring-boot:run
```

Backend starts on `http://localhost:8080`

**Frontend Setup:**
```bash
cd frontend
npm install
npm start
```

Frontend starts on `http://localhost:3000`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |

### Holdings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/holding/my` | Get all holdings |
| POST | `/api/holding/add` | Add holding |
| PUT | `/api/holding/update/{id}` | Update holding |
| DELETE | `/api/holding/delete/{id}` | Delete holding |
| GET | `/api/holding/summary` | Portfolio summary |
| GET | `/api/holding/pl` | P&L per holding |

### Trades
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/trades` | Get all trades |
| POST | `/api/trades` | Add trade manually |
| PUT | `/api/trades/{id}` | Edit trade |
| DELETE | `/api/trades/{id}` | Delete trade |
| POST | `/api/trades/sync/binance` | Sync from Binance |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/report/summary` | Full P&L summary (FIFO) |
| GET | `/api/report/tax` | Tax summary — 30% flat + 1% TDS |
| GET | `/api/report/export/csv` | Download CSV report |

### Exchange
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/exchange` | List all exchanges |
| GET | `/api/exchange/connected` | User's connected exchanges |
| POST | `/api/exchange/connect` | Connect exchange with API key |
| POST | `/api/exchange/sync` | Sync holdings from exchange |
| DELETE | `/api/exchange/{id}` | Disconnect exchange |

### Risk Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/risk/alerts` | Get all alerts |
| GET | `/api/risk/alerts/unread` | Unread alerts only |
| GET | `/api/risk/alerts/count` | Unread alert count |
| PATCH | `/api/risk/alerts/{id}/seen` | Mark alert as read |
| PATCH | `/api/risk/alerts/seen-all` | Mark all as read |
| POST | `/api/risk/scan` | Trigger manual scan |
| GET | `/api/risk/watchlist` | Get watchlist |
| POST | `/api/risk/watchlist` | Add to watchlist |
| DELETE | `/api/risk/watchlist/{id}` | Remove from watchlist |

---

## Security

- Passwords hashed with BCrypt
- JWT tokens expire after 24 hours
- API keys encrypted at rest using AES-256/GCM with random IV
- Startup validation — app refuses to start if encryption key is not 16+ bytes
- All endpoints protected (except `/api/auth/**`)
- CORS restricted via environment variable
- Stateless session management (no server-side sessions)
- No stack traces exposed in API error responses

---

## Environment Variables

Never commit real secrets. Create a `.env` file at project root based on this template:

| Variable | Description |
|---|---|
| `MYSQL_ROOT_PASSWORD` | MySQL root password for Docker |
| `MYSQL_USER` | MySQL app user |
| `MYSQL_PASSWORD` | MySQL app user password |
| `DB_URL` | JDBC connection string |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing key (min 32 chars) |
| `ENCRYPTION_SECRET` | AES key for API key encryption (exactly 32 chars) |
| `ETHERSCAN_API_KEY` | Etherscan API key for contract verification |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `REACT_APP_API_URL` | Backend URL for frontend |
| `DDL_AUTO` | Hibernate DDL mode (`update` for dev, `validate` for prod) |
| `SHOW_SQL` | Log SQL queries (`false` for prod) |

---

## Roadmap

- [x] Auth — JWT login/register with BCrypt
- [x] Holdings — CRUD with live P&L
- [x] Real-time pricing — CoinGecko with 5-min cache
- [x] Dashboard — Portfolio chart + asset table
- [x] Portfolio — Allocation charts + breakdown
- [x] Trade history — Manual entry + Binance sync
- [x] P&L Reports — FIFO gains, PDF + CSV export
- [x] Tax Hints — India 30% flat tax + 1% TDS (Section 115BBH / 194S)
- [x] Risk & Scam Alerts — Etherscan + GoPlus + volatility detection
- [x] Exchange connection — Binance API key management
- [x] Security hardening — AES-256, JWT logging, CORS env config
- [x] Unit tests — 15 test cases for PLReportService
- [x] Docker deployment — Multi-stage build, docker-compose
- [ ] Cloud deployment
