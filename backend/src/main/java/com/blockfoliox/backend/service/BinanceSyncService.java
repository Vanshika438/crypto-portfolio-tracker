package com.blockfoliox.backend.service;

import com.blockfoliox.backend.model.ApiKey;
import com.blockfoliox.backend.model.Exchange;
import com.blockfoliox.backend.model.Trade;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.ApiKeyRepository;
import com.blockfoliox.backend.repository.ExchangeRepository;
import com.blockfoliox.backend.repository.TradeRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
public class BinanceSyncService {

    private final TradeRepository tradeRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final ExchangeRepository exchangeRepository;
    private final EncryptionService encryptionService;
    private final PLReportService plReportService;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String BINANCE_BASE = "https://api.binance.com";

    public BinanceSyncService(
            TradeRepository tradeRepository,
            ApiKeyRepository apiKeyRepository,
            ExchangeRepository exchangeRepository,
            EncryptionService encryptionService,
            PLReportService plReportService) {
        this.tradeRepository    = tradeRepository;
        this.apiKeyRepository   = apiKeyRepository;
        this.exchangeRepository = exchangeRepository;
        this.encryptionService  = encryptionService;
        this.plReportService    = plReportService;
    }

    public List<Trade> syncTrades(User user) {
        Exchange binance = exchangeRepository.findByName("Binance")
                .orElseThrow(() -> new RuntimeException("Binance exchange not found"));

        Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByUserAndExchange(user, binance);

        if (apiKeyOpt.isEmpty()) {
            return syncDemoTrades(user);
        }

        String decryptedKey    = encryptionService.decrypt(apiKeyOpt.get().getApiKey());
        String decryptedSecret = encryptionService.decrypt(apiKeyOpt.get().getApiSecret());
        BigDecimal usdToInr    = plReportService.getUsdToInrRate();

        String[] symbols = {
            "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT",
            "ADAUSDT", "DOGEUSDT", "XRPUSDT", "DOTUSDT",
            "MATICUSDT", "LINKUSDT", "UNIUSDT", "LTCUSDT"
        };

        List<Trade> allSynced = new ArrayList<>();
        for (String symbol : symbols) {
            try {
                List<Trade> trades = fetchBinanceTrades(
                        user, symbol, decryptedKey, decryptedSecret, usdToInr);
                allSynced.addAll(trades);
            } catch (Exception e) {
                System.err.println("Failed to sync " + symbol + ": " + e.getMessage());
            }
        }
        return allSynced;
    }

    // ── Demo trades — used when no Binance API key is connected ──────────────
    private List<Trade> syncDemoTrades(User user) {
        BigDecimal usdToInr = plReportService.getUsdToInrRate();

        // symbol, type, qty, priceUsd, daysAgo
        List<Object[]> demoData = List.of(
            new Object[]{"BTC",  "BUY",  0.05,   45000.0,  90},
            new Object[]{"BTC",  "BUY",  0.03,   52000.0,  60},
            new Object[]{"BTC",  "SELL", 0.02,   67000.0,  10},
            new Object[]{"ETH",  "BUY",  1.5,    2200.0,   80},
            new Object[]{"ETH",  "BUY",  1.0,    2500.0,   45},
            new Object[]{"ETH",  "SELL", 0.5,    2800.0,   15},
            new Object[]{"SOL",  "BUY",  10.0,   110.0,    70},
            new Object[]{"BNB",  "BUY",  2.0,    380.0,    50},
            new Object[]{"DOGE", "BUY",  5000.0, 0.12,     40},
            new Object[]{"XRP",  "BUY",  1000.0, 0.55,     35}
        );

        List<Trade> saved = new ArrayList<>();

        for (Object[] d : demoData) {
            String symbol   = (String) d[0];
            String type     = (String) d[1];
            double qty      = (double) d[2];
            double priceUsd = (double) d[3];
            int daysAgo     = (int)    d[4];

            LocalDateTime executedAt = LocalDateTime.now().minusDays(daysAgo);
            Trade.TradeType tradeType = Trade.TradeType.valueOf(type);

            // ── Deduplication check ───────────────────────────────────────────
            boolean exists = tradeRepository
                    .existsByUserAndExchangeAndAssetSymbolAndExecutedAtAndType(
                            user, "Binance (Demo)", symbol, executedAt, tradeType);

            if (exists) {
                continue;
            }

            BigDecimal pUsd = BigDecimal.valueOf(priceUsd)
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal pInr = pUsd.multiply(usdToInr)
                    .setScale(2, RoundingMode.HALF_UP);

            Trade trade = Trade.builder()
                    .user(user)
                    .assetSymbol(symbol)
                    .type(tradeType)
                    .quantity(BigDecimal.valueOf(qty))
                    .priceInr(pInr)
                    .priceUsd(pUsd)
                    .feeInr(BigDecimal.valueOf(10))
                    .feeUsd(BigDecimal.valueOf(0.12))
                    .exchange("Binance (Demo)")
                    .notes("Demo trade — synced for testing")
                    .executedAt(executedAt)
                    .build();

            saved.add(tradeRepository.save(trade));
        }

        return saved;
    }

    private List<Trade> fetchBinanceTrades(
            User user, String symbol,
            String apiKey, String apiSecret,
            BigDecimal usdToInr) throws Exception {

        long timestamp   = System.currentTimeMillis();
        String queryString = "symbol=" + symbol + "&timestamp=" + timestamp;
        String signature   = hmacSha256(queryString, apiSecret);
        String url = BINANCE_BASE + "/api/v3/myTrades?"
                + queryString + "&signature=" + signature;

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-MBX-APIKEY", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<List> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, List.class);

        List<Map> binanceTrades = response.getBody();
        if (binanceTrades == null) return List.of();

        List<Trade> saved = new ArrayList<>();
        String assetSymbol = symbol.replace("USDT", "");

        for (Map t : binanceTrades) {
            BigDecimal qty      = new BigDecimal(t.get("qty").toString());
            BigDecimal priceUsd = new BigDecimal(t.get("price").toString());
            BigDecimal priceInr = priceUsd.multiply(usdToInr)
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal feeUsd = BigDecimal.ZERO;
            BigDecimal feeInr = BigDecimal.ZERO;
            if (t.get("commission") != null) {
                feeUsd = new BigDecimal(t.get("commission").toString())
                        .multiply(priceUsd).setScale(2, RoundingMode.HALF_UP);
                feeInr = feeUsd.multiply(usdToInr)
                        .setScale(2, RoundingMode.HALF_UP);
            }

            boolean isBuyer = Boolean.TRUE.equals(t.get("isBuyer"));
            long time       = Long.parseLong(t.get("time").toString());
            LocalDateTime executedAt = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(time), ZoneId.systemDefault());

            Trade.TradeType tradeType = isBuyer ? Trade.TradeType.BUY : Trade.TradeType.SELL;

            // ── Deduplication check ───────────────────────────────────────────
            boolean exists = tradeRepository
                    .existsByUserAndExchangeAndAssetSymbolAndExecutedAtAndType(
                            user, "Binance", assetSymbol, executedAt, tradeType);

            if (exists) {
                continue;
            }

            Trade trade = Trade.builder()
                    .user(user)
                    .assetSymbol(assetSymbol)
                    .type(tradeType)
                    .quantity(qty)
                    .priceInr(priceInr)
                    .priceUsd(priceUsd)
                    .feeInr(feeInr)
                    .feeUsd(feeUsd)
                    .exchange("Binance")
                    .notes("Synced from Binance")
                    .executedAt(executedAt)
                    .build();

            saved.add(tradeRepository.save(trade));
        }

        return saved;
    }

    private String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        byte[] hash = mac.doFinal(data.getBytes());
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}