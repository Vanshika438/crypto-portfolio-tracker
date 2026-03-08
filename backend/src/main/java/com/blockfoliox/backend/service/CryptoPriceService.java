package com.blockfoliox.backend.service;

import com.blockfoliox.backend.model.Holding;
import com.blockfoliox.backend.repository.HoldingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CryptoPriceService {

    private final RestTemplate restTemplate;
    private final HoldingRepository holdingRepository;

    private static final long CACHE_DURATION = 300000; // 5 minutes

    private Map<String, Map<String, Object>> cachedPrices;
    private long lastPriceFetchTime = 0;

    private List<Map<String, Object>> cachedMarketData;
    private long lastMarketFetchTime = 0;

    public CryptoPriceService(HoldingRepository holdingRepository) {
        this.restTemplate = new RestTemplate();
        this.holdingRepository = holdingRepository;
    }

    /**
     * Get unique coins from holdings table
     */
    private String getCoinIdsFromDatabase() {

        List<Holding> holdings = holdingRepository.findAll();

        Set<String> coinIds = holdings.stream()
                .map(h -> mapToCoinGeckoId(h.getAssetName()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (coinIds.isEmpty()) {
            coinIds.add("bitcoin"); // fallback
        }

        return String.join(",", coinIds);
    }

    public synchronized Map<String, Map<String, Object>> getAllPrices() {

        long currentTime = System.currentTimeMillis();

        if (cachedPrices != null && (currentTime - lastPriceFetchTime) < CACHE_DURATION) {
            return cachedPrices;
        }

        String coinIds = getCoinIdsFromDatabase();

        String url = "https://api.coingecko.com/api/v3/simple/price"
                + "?ids=" + coinIds
                + "&vs_currencies=inr";

        try {

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            cachedPrices = response.getBody();
            lastPriceFetchTime = currentTime;

            return cachedPrices;

        } catch (Exception e) {

            System.err.println("Error fetching prices: " + e.getMessage());

            return cachedPrices != null ? cachedPrices : new HashMap<>();
        }
    }

    public synchronized List<Map<String, Object>> getAllMarketData() {

        long currentTime = System.currentTimeMillis();

        if (cachedMarketData != null && (currentTime - lastMarketFetchTime) < CACHE_DURATION) {
            return cachedMarketData;
        }

        String coinIds = getCoinIdsFromDatabase();

        String url = "https://api.coingecko.com/api/v3/coins/markets"
                + "?vs_currency=inr"
                + "&ids=" + coinIds
                + "&sparkline=true"
                + "&price_change_percentage=7d";

        try {

            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);

            cachedMarketData = response.getBody();
            lastMarketFetchTime = currentTime;

            return cachedMarketData;

        } catch (Exception e) {

            System.err.println("Error fetching market data: " + e.getMessage());

            return cachedMarketData != null ? cachedMarketData : List.of();
        }
    }

    public BigDecimal getCurrentPrice(String assetName) {

        String coinId = mapToCoinGeckoId(assetName);

        Map<String, Map<String, Object>> prices = getAllPrices();

        if (prices == null || !prices.containsKey(coinId)) {
            return BigDecimal.ZERO;
        }

        Map<String, Object> priceData = prices.get(coinId);

        return new BigDecimal(priceData.get("inr").toString());
    }

    /**
     * Automatically refresh prices every 5 minutes
     */
    @Scheduled(fixedRate = 300000)
    public void refreshMarketData() {

        try {

            System.out.println("Refreshing crypto price cache...");

            getAllPrices();
            getAllMarketData();

        } catch (Exception e) {

            System.err.println("Scheduled refresh failed: " + e.getMessage());
        }
    }

    /**
     * Map asset names to CoinGecko IDs
     */
    private String mapToCoinGeckoId(String symbol) {

        if (symbol == null) return null;

        return switch (symbol.toUpperCase()) {
            case "BTC", "BITCOIN" -> "bitcoin";
            case "ETH", "ETHEREUM" -> "ethereum";
            case "SOL", "SOLANA" -> "solana";
            case "ADA", "CARDANO" -> "cardano";
            case "BNB", "BINANCECOIN", "BINANCE COIN" -> "binancecoin";
            case "USDT", "TETHER" -> "tether";
            case "XRP", "RIPPLE" -> "ripple";
            case "DOGE", "DOGECOIN" -> "dogecoin";
            case "DOT", "POLKADOT" -> "polkadot";
            case "MATIC", "POLYGON" -> "matic-network";
            default -> symbol.toLowerCase();
        };
    }
}