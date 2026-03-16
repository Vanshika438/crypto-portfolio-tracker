package com.blockfoliox.backend.service;

import com.blockfoliox.backend.model.*;
import com.blockfoliox.backend.repository.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RiskDetectionService {

    private final HoldingRepository holdingRepository;
    private final UserRepository userRepository;
    private final RiskAlertRepository riskAlertRepository;
    private final WatchlistRepository watchlistRepository;
    private final EtherscanService etherscanService;
    private final TokenSecurityService tokenSecurityService;  
    private final CryptoPriceService cryptoPriceService;

    private static final Map<String, String> KNOWN_CONTRACTS = Map.of(
            "USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7",
            "LINK", "0x514910771af9ca656af840dff83e8264ecf986ca",
            "UNI",  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"
    );

    public RiskDetectionService(
            HoldingRepository holdingRepository,
            UserRepository userRepository,
            RiskAlertRepository riskAlertRepository,
            WatchlistRepository watchlistRepository,
            EtherscanService etherscanService,
            TokenSecurityService tokenSecurityService,  
            CryptoPriceService cryptoPriceService) {

        this.holdingRepository   = holdingRepository;
        this.userRepository      = userRepository;
        this.riskAlertRepository = riskAlertRepository;
        this.watchlistRepository = watchlistRepository;
        this.etherscanService    = etherscanService;
        this.tokenSecurityService = tokenSecurityService; 
        this.cryptoPriceService  = cryptoPriceService;
    }

    @Scheduled(fixedRate = 21_600_000)
    public void runScheduledScan() {
        List<User> users = userRepository.findAll();
        for (User user : users) {
            scanUserHoldings(user);
        }
    }

    public List<RiskAlert> scanUserHoldings(User user) {
        List<Holding> holdings = holdingRepository.findByUser(user);

        for (Holding holding : holdings) {
            String symbol = holding.getAssetName().toUpperCase();

            checkScamContract(user, symbol);
            checkCoinGeckoPresence(user, symbol);
            checkMarketCapAndVolatility(user, symbol);
            checkWatchlist(user, symbol);
        }

        return riskAlertRepository.findByUserOrderByCreatedAtDesc(user);
    }

    private void checkScamContract(User user, String symbol) {
        String contractAddress = KNOWN_CONTRACTS.get(symbol);
        if (contractAddress == null) return;

        boolean isRisky    = tokenSecurityService.isRiskyToken(contractAddress);
        boolean unverified = !etherscanService.isContractVerified(contractAddress);
        int txCount        = etherscanService.getContractTxCount(contractAddress);

        if (isRisky) {
            String riskSummary = tokenSecurityService.getRiskSummary(contractAddress);
            saveAlertIfNew(user, symbol,
                    RiskAlert.AlertType.RUGPULL_WARNING,
                    riskSummary);
        }

        if (unverified) {
            saveAlertIfNew(user, symbol,
                    RiskAlert.AlertType.CONTRACT_RISK,
                    "Contract " + contractAddress + " is unverified on Etherscan.");
        }

        if (txCount < 5) {
            saveAlertIfNew(user, symbol,
                    RiskAlert.AlertType.CONTRACT_RISK,
                    "Contract " + contractAddress + " has very few transactions (" +
                            txCount + "). Possible new or inactive contract.");
        }
    }

    private void checkCoinGeckoPresence(User user, String symbol) {
        java.math.BigDecimal price = cryptoPriceService.getCurrentPrice(symbol);
        if (price.compareTo(java.math.BigDecimal.ZERO) == 0) {
            saveAlertIfNew(user, symbol,
                    RiskAlert.AlertType.NOT_ON_COINGECKO,
                    symbol + " could not be found on CoinGecko. Verify this asset is legitimate.");
        }
    }

    private void checkMarketCapAndVolatility(User user, String symbol) {
        List<Map<String, Object>> marketData = cryptoPriceService.getAllMarketData();
        if (marketData == null) return;

        for (Map<String, Object> coin : marketData) {
            String id = (String) coin.get("id");
            if (id == null) continue;
            if (!id.equalsIgnoreCase(symbol) &&
                    !symbol.equalsIgnoreCase((String) coin.get("symbol"))) continue;

            Object mcap = coin.get("market_cap");
            if (mcap instanceof Number) {
                double marketCap = ((Number) mcap).doubleValue();
                if (marketCap > 0 && marketCap < 6_000_000_000.0) {
                    saveAlertIfNew(user, symbol,
                            RiskAlert.AlertType.LOW_MARKET_CAP,
                            symbol + " has a low market cap (₹" +
                                    String.format("%.2f", marketCap / 10_000_000) +
                                    " Cr). Higher risk of manipulation.");
                }
            }

            Object change = coin.get("price_change_percentage_24h");
            if (change instanceof Number) {
                double pct = Math.abs(((Number) change).doubleValue());
                if (pct > 20.0) {
                    saveAlertIfNew(user, symbol,
                            RiskAlert.AlertType.HIGH_VOLATILITY,
                            symbol + " moved " + String.format("%.1f", pct) +
                                    "% in 24 hours. High volatility detected.");
                }
            }
            break;
        }
    }

    private void checkWatchlist(User user, String symbol) {
        boolean flagged = watchlistRepository.existsByUserAndAssetSymbol(user, symbol);
        if (flagged) {
            saveAlertIfNew(user, symbol,
                    RiskAlert.AlertType.WATCHLIST_FLAG,
                    symbol + " is on your watchlist.");
        }
    }

    private void saveAlertIfNew(User user, String symbol,
                                RiskAlert.AlertType type, String details) {
        boolean exists = riskAlertRepository
                .existsByUserAndAssetSymbolAndAlertType(user, symbol, type);
        if (!exists) {
            riskAlertRepository.save(RiskAlert.builder()
                    .user(user)
                    .assetSymbol(symbol)
                    .alertType(type)
                    .details(details)
                    .seen(false)
                    .build());
        }
    }
}