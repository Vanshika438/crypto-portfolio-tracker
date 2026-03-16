package com.blockfoliox.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class EtherscanService {

    @Value("${etherscan.api.key}")
    private String apiKey;

    private static final String BASE_URL = "https://api.etherscan.io/api";
    private final RestTemplate restTemplate = new RestTemplate();

    // Returns true if the contract has verified source code (legitimate signal)
    public boolean isContractVerified(String contractAddress) {
        try {
            String url = BASE_URL
                    + "?module=contract"
                    + "&action=getabi"
                    + "&address=" + contractAddress
                    + "&apikey=" + apiKey;

            Map response = restTemplate.getForObject(url, Map.class);

            if (response == null) return false;

            // status "1" means ABI was found (contract is verified)
            return "1".equals(response.get("status"));

        } catch (Exception e) {
            System.err.println("Etherscan check failed for " + contractAddress + ": " + e.getMessage());
            return false;
        }
    }

    // Returns transaction count — very low tx count on a contract is a risk signal
    public int getContractTxCount(String contractAddress) {
        try {
            String url = BASE_URL
                    + "?module=account"
                    + "&action=txlist"
                    + "&address=" + contractAddress
                    + "&page=1"
                    + "&offset=10"
                    + "&sort=asc"
                    + "&apikey=" + apiKey;

            Map response = restTemplate.getForObject(url, Map.class);

            if (response == null) return 0;
            if (!"1".equals(response.get("status"))) return 0;

            Object result = response.get("result");
            if (result instanceof java.util.List<?> list) {
                return list.size();
            }
            return 0;

        } catch (Exception e) {
            System.err.println("Etherscan tx count failed: " + e.getMessage());
            return 0;
        }
    }
}