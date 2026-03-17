# BlockfolioX — Crypto Portfolio Tracker

A full-stack cryptocurrency portfolio tracker with real-time pricing, P&L analytics, risk detection, and exchange integration.

**Tech Stack:** Spring Boot 3.4.1 · React 19 · MySQL · Tailwind CSS · Recharts

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
- Export to CSV (4 sections — portfolio summary, holdings, realized gains, trade history)

### Risk & Scam Alerts
- Contract verification via Etherscan API
- Honeypot, mintable, proxy, blacklist detection via GoPlus API
- Low market cap and high volatility alerts
- Watchlist management — monitor tokens for risk
- Scheduled scan every 6 hours + manual scan
- Unread alert badge on navbar

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
| Encryption | AES/GCM for API keys at rest |
| Pricing | CoinGecko API (5-min cache) |
| Risk | Etherscan API, GoPlus API |
| Exchange Rate | exchangerate-api.com |

---

## Project Structure

```
crypto-portfolio-tracker/
├── backend/
│   └── src/main/java/com/blockfoliox/backend/
│       ├── controller/       # REST controllers
│       ├── model/            # JPA entities
│       ├── repository/       # Spring Data repositories
│       ├── service/          # Business logic
│       ├── security/         # JWT filter, config
│       └── config/           # Data initializer, exception handler
└── frontend/
    └── src/
        ├── api/              # Axios API calls
        ├── auth/             # Login/Register page
        ├── components/       # Navbar, ProtectedRoute, Skeleton
        ├── context/          # AuthContext
        └── pages/            # Dashboard, Portfolio, Holdings, Trades, Report, etc.
```

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- MySQL 8+
- Maven 3.9+

### Backend Setup

```bash
cd backend
```

Create a MySQL database:

```sql
CREATE DATABASE blockfoliox;
```

Configure `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/blockfoliox?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password
jwt.secret=your_jwt_secret_key_min_32_characters_long
encryption.secret=your_16_char_key_
etherscan.api.key=your_etherscan_api_key
```

Run the backend:

```bash
./mvnw spring-boot:run
```

Backend starts on `http://localhost:8080`

### Frontend Setup

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
- API keys encrypted at rest using AES/GCM with random IV
- All endpoints protected (except `/api/auth/**`)
- CORS restricted to `localhost:3000`
- Stateless session management

---

## Environment Variables

Never commit real secrets. Use the following placeholders in `application.properties`:

```properties
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password
jwt.secret=your_jwt_secret_key_min_32_characters_long
encryption.secret=your_16_char_key_
etherscan.api.key=your_etherscan_api_key
```

---

## Roadmap

- [x] Auth — JWT login/register
- [x] Holdings — CRUD with live P&L
- [x] Real-time pricing — CoinGecko with 5-min cache
- [x] Dashboard — Portfolio chart + asset table
- [x] Portfolio — Allocation charts + breakdown
- [x] Trade history — Manual entry + Binance sync
- [x] P&L Reports — FIFO gains, PDF + CSV export
- [x] Risk & Scam Alerts — Etherscan + GoPlus
- [x] Exchange connection — Binance API key management
- [ ] Deployment (Week 8)
- [ ] Real Binance sync with live API key
