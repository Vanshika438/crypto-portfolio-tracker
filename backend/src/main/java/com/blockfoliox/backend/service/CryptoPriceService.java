package com.blockfoliox.backend.service;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class CryptoPriceService {

    private final RestTemplate restTemplate;

    public CryptoPriceService() {
        this.restTemplate = new RestTemplate();
    }

    public double getCurrentPrice(String assetName) {

        String coinId = mapToCoinGeckoId(assetName);

        String url = "https://api.coingecko.com/api/v3/simple/price?ids="
                + coinId + "&vs_currencies=inr";

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            Map<String, Object> body = response.getBody();

            if (body == null || !body.containsKey(coinId)) {
                throw new RuntimeException("Invalid response from CoinGecko");
            }

            Map<String, Object> priceData = (Map<String, Object>) body.get(coinId);

            return Double.parseDouble(priceData.get("inr").toString());

        } catch (Exception e) {
            System.err.println("Error fetching price: " + e.getMessage());
            return 0.0;
        }
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