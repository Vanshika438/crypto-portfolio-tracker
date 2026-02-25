package com.blockfoliox.backend.service;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class CryptoPriceService {

    private final RestTemplate restTemplate;

    private Map<String, Map<String, Object>> cachedPrices;
    private long lastFetchTime = 0;
    private static final long CACHE_DURATION = 60000;

    public CryptoPriceService() {
        this.restTemplate = new RestTemplate();
    }

    public Map<String, Map<String, Object>> getAllPrices() {

        long currentTime = System.currentTimeMillis();

        // Use cache if within 60 seconds
        if (cachedPrices != null && (currentTime - lastFetchTime) < CACHE_DURATION) {
            return cachedPrices;
        }

        String url = "https://api.coingecko.com/api/v3/simple/price"
                + "?ids=bitcoin,ethereum,solana,cardano,binancecoin,tether,ripple,dogecoin,polkadot,matic-network"
                + "&vs_currencies=inr";

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            cachedPrices = response.getBody();
            lastFetchTime = currentTime;

            return cachedPrices;

        } catch (Exception e) {
            System.err.println("Error fetching price: " + e.getMessage());
            return cachedPrices;
        }
    }

    public List<Map<String, Object>> getAllMarketData() {

        String url = "https://api.coingecko.com/api/v3/coins/markets"
                + "?vs_currency=inr"
                + "&ids=bitcoin,ethereum,solana,cardano,binancecoin,tether,ripple,dogecoin,polkadot,matic-network"
                + "&sparkline=true"
                + "&price_change_percentage=7d";

        try {
            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error fetching market data: " + e.getMessage());
            return List.of();
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

    private String mapToCoinGeckoId(String symbol) {
        return switch (symbol.toUpperCase()) {
            case "BTC" -> "bitcoin";
            case "ETH" -> "ethereum";
            case "SOL" -> "solana";
            case "ADA" -> "cardano";
            case "BNB" -> "binancecoin";
            case "USDT" -> "tether";
            case "XRP" -> "ripple";
            case "DOGE" -> "dogecoin";
            case "DOT" -> "polkadot";
            case "MATIC" -> "matic-network";
            default -> symbol.toLowerCase();
        };
    }
}