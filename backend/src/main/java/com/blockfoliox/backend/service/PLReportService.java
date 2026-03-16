package com.blockfoliox.backend.service;

import com.blockfoliox.backend.model.Holding;
import com.blockfoliox.backend.model.Trade;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.HoldingRepository;
import com.blockfoliox.backend.repository.TradeRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class PLReportService {

    private final TradeRepository tradeRepository;
    private final HoldingRepository holdingRepository;
    private final CryptoPriceService cryptoPriceService;
    private final RestTemplate restTemplate = new RestTemplate();

    public PLReportService(
            TradeRepository tradeRepository,
            HoldingRepository holdingRepository,
            CryptoPriceService cryptoPriceService) {
        this.tradeRepository = tradeRepository;
        this.holdingRepository = holdingRepository;
        this.cryptoPriceService = cryptoPriceService;
    }

    // ─── Fetch live USD/INR rate ───────────────────────────────────────────
    public BigDecimal getUsdToInrRate() {
        try {
            String url = "https://api.exchangerate-api.com/v4/latest/USD";
            Map response = restTemplate.getForObject(url, Map.class);
            if (response != null) {
                Map rates = (Map) response.get("rates");
                if (rates != null && rates.get("INR") != null) {
                    return new BigDecimal(rates.get("INR").toString())
                            .setScale(2, RoundingMode.HALF_UP);
                }
            }
        } catch (Exception e) {
            System.err.println("Exchange rate fetch failed: " + e.getMessage());
        }
        return new BigDecimal("83.50"); // fallback rate
    }

    // ─── FIFO Realized Gains per symbol ───────────────────────────────────
    public Map<String, Object> calculateRealizedGains(User user) {

        List<Trade> allTrades = tradeRepository.findByUserOrderByExecutedAtDesc(user);
        Set<String> symbols = new HashSet<>();
        allTrades.forEach(t -> symbols.add(t.getAssetSymbol()));

        BigDecimal totalRealizedInr = BigDecimal.ZERO;
        BigDecimal totalRealizedUsd = BigDecimal.ZERO;
        List<Map<String, Object>> breakdown = new ArrayList<>();

        for (String symbol : symbols) {
            List<Trade> trades = tradeRepository
                    .findByUserAndAssetSymbolOrderByExecutedAtAsc(user, symbol);

            // FIFO queue of (quantity, costPriceInr, costPriceUsd)
            Deque<BigDecimal[]> fifoQueue = new ArrayDeque<>();
            BigDecimal symbolRealizedInr = BigDecimal.ZERO;
            BigDecimal symbolRealizedUsd = BigDecimal.ZERO;

            for (Trade trade : trades) {
                if (trade.getType() == Trade.TradeType.BUY) {
                    fifoQueue.addLast(new BigDecimal[]{
                            trade.getQuantity(),
                            trade.getPriceInr(),
                            trade.getPriceUsd()
                    });
                } else if (trade.getType() == Trade.TradeType.SELL) {
                    BigDecimal remainingToSell = trade.getQuantity();

                    while (remainingToSell.compareTo(BigDecimal.ZERO) > 0
                            && !fifoQueue.isEmpty()) {

                        BigDecimal[] oldest = fifoQueue.peekFirst();
                        BigDecimal available = oldest[0];
                        BigDecimal costInr   = oldest[1];
                        BigDecimal costUsd   = oldest[2];

                        BigDecimal sold = remainingToSell.min(available);

                        // Gain = (sell price - cost price) * qty sold
                        BigDecimal gainInr = trade.getPriceInr()
                                .subtract(costInr).multiply(sold);
                        BigDecimal gainUsd = trade.getPriceUsd()
                                .subtract(costUsd).multiply(sold);

                        symbolRealizedInr = symbolRealizedInr.add(gainInr);
                        symbolRealizedUsd = symbolRealizedUsd.add(gainUsd);

                        remaining: {
                            if (available.compareTo(remainingToSell) <= 0) {
                                fifoQueue.pollFirst();
                            } else {
                                oldest[0] = available.subtract(sold);
                            }
                        }
                        remainingToSell = remainingToSell.subtract(sold);
                    }
                }
            }

            totalRealizedInr = totalRealizedInr.add(symbolRealizedInr);
            totalRealizedUsd = totalRealizedUsd.add(symbolRealizedUsd);

            Map<String, Object> row = new HashMap<>();
            row.put("symbol",         symbol);
            row.put("realizedGainInr", symbolRealizedInr.setScale(2, RoundingMode.HALF_UP));
            row.put("realizedGainUsd", symbolRealizedUsd.setScale(2, RoundingMode.HALF_UP));
            breakdown.add(row);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalRealizedInr", totalRealizedInr.setScale(2, RoundingMode.HALF_UP));
        result.put("totalRealizedUsd", totalRealizedUsd.setScale(2, RoundingMode.HALF_UP));
        result.put("breakdown",        breakdown);
        return result;
    }

    // ─── Unrealized Gains from current holdings ───────────────────────────
    public Map<String, Object> calculateUnrealizedGains(User user) {

        List<Holding> holdings = holdingRepository.findByUser(user);
        BigDecimal usdToInr = getUsdToInrRate();

        BigDecimal totalUnrealizedInr = BigDecimal.ZERO;
        BigDecimal totalUnrealizedUsd = BigDecimal.ZERO;
        BigDecimal totalInvestedInr   = BigDecimal.ZERO;
        BigDecimal totalCurrentInr    = BigDecimal.ZERO;

        List<Map<String, Object>> breakdown = new ArrayList<>();

        for (Holding h : holdings) {
            BigDecimal currentPriceInr = cryptoPriceService.getCurrentPrice(h.getAssetName());
            BigDecimal currentPriceUsd = usdToInr.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : currentPriceInr.divide(usdToInr, 8, RoundingMode.HALF_UP);

            BigDecimal investedInr   = h.getBuyPrice().multiply(h.getQuantity());
            BigDecimal currentValInr = currentPriceInr.multiply(h.getQuantity());
            BigDecimal gainInr       = currentValInr.subtract(investedInr);
            BigDecimal gainUsd       = gainInr.divide(usdToInr, 2, RoundingMode.HALF_UP);

            BigDecimal gainPct = investedInr.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : gainInr.divide(investedInr, 4, RoundingMode.HALF_UP)
                             .multiply(BigDecimal.valueOf(100));

            totalUnrealizedInr = totalUnrealizedInr.add(gainInr);
            totalUnrealizedUsd = totalUnrealizedUsd.add(gainUsd);
            totalInvestedInr   = totalInvestedInr.add(investedInr);
            totalCurrentInr    = totalCurrentInr.add(currentValInr);

            Map<String, Object> row = new HashMap<>();
            row.put("symbol",             h.getAssetName());
            row.put("quantity",           h.getQuantity());
            row.put("avgCostInr",         h.getBuyPrice().setScale(2, RoundingMode.HALF_UP));
            row.put("currentPriceInr",    currentPriceInr.setScale(2, RoundingMode.HALF_UP));
            row.put("currentPriceUsd",    currentPriceUsd.setScale(2, RoundingMode.HALF_UP));
            row.put("unrealizedGainInr",  gainInr.setScale(2, RoundingMode.HALF_UP));
            row.put("unrealizedGainUsd",  gainUsd.setScale(2, RoundingMode.HALF_UP));
            row.put("gainPercent",        gainPct.setScale(2, RoundingMode.HALF_UP));
            breakdown.add(row);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalUnrealizedInr", totalUnrealizedInr.setScale(2, RoundingMode.HALF_UP));
        result.put("totalUnrealizedUsd", totalUnrealizedUsd.setScale(2, RoundingMode.HALF_UP));
        result.put("totalInvestedInr",   totalInvestedInr.setScale(2, RoundingMode.HALF_UP));
        result.put("totalCurrentInr",    totalCurrentInr.setScale(2, RoundingMode.HALF_UP));
        result.put("breakdown",          breakdown);
        return result;
    }

    // ─── Full portfolio summary ────────────────────────────────────────────
    public Map<String, Object> getFullSummary(User user) {
        Map<String, Object> realized   = calculateRealizedGains(user);
        Map<String, Object> unrealized = calculateUnrealizedGains(user);
        BigDecimal usdToInr            = getUsdToInrRate();

        Map<String, Object> summary = new HashMap<>();
        summary.put("realized",   realized);
        summary.put("unrealized", unrealized);
        summary.put("usdToInrRate", usdToInr);
        return summary;
    }
}