package com.blockfoliox.backend.service;

import com.blockfoliox.backend.model.ScamToken;
import com.blockfoliox.backend.repository.ScamTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class TokenSecurityService {

    private static final String BASE_URL =
            "https://api.gopluslabs.io/api/v1/token_security/1"; // 1 = Ethereum mainnet

    private final RestTemplate restTemplate = new RestTemplate();
    private final ScamTokenRepository scamTokenRepository;

    public TokenSecurityService(ScamTokenRepository scamTokenRepository) {
        this.scamTokenRepository = scamTokenRepository;
    }

    public boolean isRiskyToken(String contractAddress) {
        // Check local cache first
        if (scamTokenRepository.existsByContractAddressIgnoreCase(contractAddress)) {
            return true;
        }

        try {
            String url = BASE_URL + "?contract_addresses=" + contractAddress;
            Map response = restTemplate.getForObject(url, Map.class);

            if (response == null) return false;

            Map result = (Map) response.get("result");
            if (result == null) return false;

            Map tokenData = (Map) result.get(contractAddress.toLowerCase());
            if (tokenData == null) return false;

            // GoPlus flags — any of these = risky
            boolean isHoneypot     = "1".equals(String.valueOf(tokenData.get("is_honeypot")));
            boolean isMintable     = "1".equals(String.valueOf(tokenData.get("is_mintable")));
            boolean isProxy        = "1".equals(String.valueOf(tokenData.get("is_proxy")));
            boolean blacklisted    = "1".equals(String.valueOf(tokenData.get("is_blacklisted")));
            boolean selfDestruct   = "1".equals(String.valueOf(tokenData.get("selfdestruct")));

            boolean risky = isHoneypot || isMintable || isProxy || blacklisted || selfDestruct;

            if (risky) {
                // Cache it locally
                ScamToken.RiskLevel level = isHoneypot ? ScamToken.RiskLevel.HIGH
                        : ScamToken.RiskLevel.MEDIUM;

                scamTokenRepository.save(ScamToken.builder()
                        .contractAddress(contractAddress.toLowerCase())
                        .chain("ethereum")
                        .riskLevel(level)
                        .source("GoPlus")
                        .lastSeen(LocalDateTime.now())
                        .build());
            }

            return risky;

        } catch (Exception e) {
            System.err.println("GoPlus check failed for " + contractAddress
                    + ": " + e.getMessage());
            return false;
        }
    }

    public String getRiskSummary(String contractAddress) {
        try {
            String url = BASE_URL + "?contract_addresses=" + contractAddress;
            Map response = restTemplate.getForObject(url, Map.class);
            if (response == null) return "Unable to fetch risk data";

            Map result = (Map) response.get("result");
            if (result == null) return "No data found";

            Map tokenData = (Map) result.get(contractAddress.toLowerCase());
            if (tokenData == null) return "Token not found";

            StringBuilder summary = new StringBuilder();
            if ("1".equals(String.valueOf(tokenData.get("is_honeypot"))))
                summary.append("Honeypot detected. ");
            if ("1".equals(String.valueOf(tokenData.get("is_mintable"))))
                summary.append("Token is mintable (supply can be inflated). ");
            if ("1".equals(String.valueOf(tokenData.get("is_proxy"))))
                summary.append("Proxy contract — logic can be changed by owner. ");
            if ("1".equals(String.valueOf(tokenData.get("is_blacklisted"))))
                summary.append("Blacklist function present. ");
            if ("1".equals(String.valueOf(tokenData.get("selfdestruct"))))
                summary.append("Contract can self-destruct. ");

            return summary.length() > 0 ? summary.toString().trim() : "No issues detected";

        } catch (Exception e) {
            return "Risk check unavailable";
        }
    }
}