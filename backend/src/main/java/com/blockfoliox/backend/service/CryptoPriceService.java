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

    // Removed: cachedPrices and lastPriceFetchTime (/simple/price no longer used)

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

    /**
     * Get current price from /coins/markets — same source as the frontend chart.
     * This replaces the old getCurrentPrice() which used /simple/price (different
     * endpoint, separate cache, caused chart vs summary card mismatch).
     */
    public BigDecimal getCurrentPriceFromMarket(String assetName) {

        String coinId = mapToCoinGeckoId(assetName);
        List<Map<String, Object>> marketData = getAllMarketData();

        return marketData.stream()
                .filter(coin -> coinId.equals(coin.get("id")))
                .map(coin -> {
                    Object price = coin.get("current_price");
                    if (price == null) return BigDecimal.ZERO;
                    try {
                        return new BigDecimal(price.toString());
                    } catch (Exception e) {
                        return BigDecimal.ZERO;
                    }
                })
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Automatically refresh market data every 5 minutes
     */
    @Scheduled(fixedRate = 300000)
    public void refreshMarketData() {

        try {

            System.out.println("Refreshing crypto market data cache...");

            getAllMarketData();

        } catch (Exception e) {

            System.err.println("Scheduled refresh failed: " + e.getMessage());
        }
    }

    /**
     * Map asset names to CoinGecko IDs
     */
    public String mapToCoinGeckoId(String symbol) {

        if (symbol == null)
            return null;

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
            case "MATIC", "POLYGON" -> "polygon-pos";
            case "LINK", "CHAINLINK" -> "chainlink";
            case "ATOM", "COSMOS" -> "cosmos";
            case "UNI", "UNISWAP" -> "uniswap";
            case "TRX", "TRON" -> "tron";
            case "LTC", "LITECOIN" -> "litecoin";
            case "AVAX", "AVALANCHE" -> "avalanche-2";
            case "XLM", "STELLAR" -> "stellar";
            case "ALGO", "ALGORAND" -> "algorand";
            case "VET", "VECHAIN" -> "vechain";
            case "FIL", "FILECOIN" -> "filecoin";
            case "ETC", "ETHEREUM CLASSIC" -> "ethereum-classic";
            case "SAND", "THE SANDBOX" -> "the-sandbox";
            case "MANA", "DECENTRALAND" -> "decentraland";
            case "NEAR", "NEAR PROTOCOL" -> "near";
            case "APE", "APECOIN" -> "apecoin";
            case "OP", "OPTIMISM" -> "optimism";
            default -> symbol.toLowerCase();
        };
    }
}