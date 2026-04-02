package com.blockfoliox.backend;

import com.blockfoliox.backend.model.Holding;
import com.blockfoliox.backend.model.Trade;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.HoldingRepository;
import com.blockfoliox.backend.repository.TradeRepository;
import com.blockfoliox.backend.service.CryptoPriceService;
import com.blockfoliox.backend.service.PLReportService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PLReportServiceTest {

    @Mock private TradeRepository    tradeRepository;
    @Mock private HoldingRepository  holdingRepository;
    @Mock private CryptoPriceService cryptoPriceService;

    @InjectMocks
    private PLReportService plReportService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@blockfoliox.com");
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Trade makeTrade(Trade.TradeType type, String symbol,
                            double qty, double priceInr, double priceUsd,
                            LocalDateTime at) {
        Trade t = new Trade();
        t.setType(type);
        t.setAssetSymbol(symbol);
        t.setQuantity(BigDecimal.valueOf(qty));
        t.setPriceInr(BigDecimal.valueOf(priceInr));
        t.setPriceUsd(BigDecimal.valueOf(priceUsd));
        t.setExecutedAt(at);
        t.setUser(testUser);
        return t;
    }

    private Holding makeHolding(String symbol, double qty, double buyPrice) {
        Holding h = new Holding();
        h.setAssetName(symbol);
        h.setQuantity(BigDecimal.valueOf(qty));
        h.setBuyPrice(BigDecimal.valueOf(buyPrice));
        h.setUser(testUser);
        return h;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REALIZED GAIN TESTS
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("FIFO: Simple buy then full sell — positive gain")
    void testRealizedGain_simpleProfitSell() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(10);
        LocalDateTime t2 = LocalDateTime.now();

        Trade buy  = makeTrade(Trade.TradeType.BUY,  "BTC", 1.0, 2000000, 24000, t1);
        Trade sell = makeTrade(Trade.TradeType.SELL, "BTC", 1.0, 2500000, 30000, t2);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "BTC"))
                .thenReturn(List.of(buy, sell));

        Map<String, Object> result = plReportService.calculateRealizedGains(testUser);

        // Gain INR = (2500000 - 2000000) * 1 = 500000
        assertThat((BigDecimal) result.get("totalRealizedInr"))
                .isEqualByComparingTo("500000.00");
        // Gain USD = (30000 - 24000) * 1 = 6000
        assertThat((BigDecimal) result.get("totalRealizedUsd"))
                .isEqualByComparingTo("6000.00");
    }

    @Test
    @DisplayName("FIFO: Partial sell — only sold portion generates gain")
    void testRealizedGain_partialSell() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(5);
        LocalDateTime t2 = LocalDateTime.now();

        Trade buy  = makeTrade(Trade.TradeType.BUY,  "ETH", 2.0, 200000, 2400, t1);
        Trade sell = makeTrade(Trade.TradeType.SELL, "ETH", 1.0, 250000, 3000, t2);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "ETH"))
                .thenReturn(List.of(buy, sell));

        Map<String, Object> result = plReportService.calculateRealizedGains(testUser);

        // Gain INR = (250000 - 200000) * 1 = 50000
        assertThat((BigDecimal) result.get("totalRealizedInr"))
                .isEqualByComparingTo("50000.00");
    }

    @Test
    @DisplayName("FIFO: Sell at a loss — negative realized gain")
    void testRealizedGain_lossOnSell() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(3);
        LocalDateTime t2 = LocalDateTime.now();

        Trade buy  = makeTrade(Trade.TradeType.BUY,  "SOL", 5.0, 15000, 180, t1);
        Trade sell = makeTrade(Trade.TradeType.SELL, "SOL", 5.0, 12000, 144, t2);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "SOL"))
                .thenReturn(List.of(buy, sell));

        Map<String, Object> result = plReportService.calculateRealizedGains(testUser);

        // Loss INR = (12000 - 15000) * 5 = -15000
        assertThat((BigDecimal) result.get("totalRealizedInr"))
                .isEqualByComparingTo("-15000.00");
    }

    @Test
    @DisplayName("FIFO: Multiple buys at different prices, one sell — uses oldest cost first")
    void testRealizedGain_multipleBuysOneSell_fifoOrder() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(20);
        LocalDateTime t2 = LocalDateTime.now().minusDays(10);
        LocalDateTime t3 = LocalDateTime.now();

        Trade buy1 = makeTrade(Trade.TradeType.BUY,  "BTC", 1.0, 1500000, 18000, t1);
        Trade buy2 = makeTrade(Trade.TradeType.BUY,  "BTC", 1.0, 2000000, 24000, t2);
        Trade sell = makeTrade(Trade.TradeType.SELL, "BTC", 1.0, 2500000, 30000, t3);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy1, buy2, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "BTC"))
                .thenReturn(List.of(buy1, buy2, sell));

        Map<String, Object> result = plReportService.calculateRealizedGains(testUser);

        // FIFO uses buy1 cost: gain = (2500000 - 1500000) * 1 = 1000000
        assertThat((BigDecimal) result.get("totalRealizedInr"))
                .isEqualByComparingTo("1000000.00");
    }

    @Test
    @DisplayName("FIFO: Sell spans across two buy lots")
    void testRealizedGain_sellSpansMultipleLots() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(15);
        LocalDateTime t2 = LocalDateTime.now().minusDays(10);
        LocalDateTime t3 = LocalDateTime.now();

        Trade buy1 = makeTrade(Trade.TradeType.BUY,  "ETH", 1.0, 150000, 1800, t1);
        Trade buy2 = makeTrade(Trade.TradeType.BUY,  "ETH", 1.0, 180000, 2160, t2);
        Trade sell = makeTrade(Trade.TradeType.SELL, "ETH", 2.0, 200000, 2400, t3);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy1, buy2, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "ETH"))
                .thenReturn(List.of(buy1, buy2, sell));

        Map<String, Object> result = plReportService.calculateRealizedGains(testUser);

        // gain = (200000-150000)*1 + (200000-180000)*1 = 50000 + 20000 = 70000
        assertThat((BigDecimal) result.get("totalRealizedInr"))
                .isEqualByComparingTo("70000.00");
    }

    @Test
    @DisplayName("No trades — realized gain is zero with empty breakdown")
    void testRealizedGain_noTrades() {
        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of());

        Map<String, Object> result = plReportService.calculateRealizedGains(testUser);

        assertThat((BigDecimal) result.get("totalRealizedInr"))
                .isEqualByComparingTo("0.00");
        assertThat((List<?>) result.get("breakdown")).isEmpty();
    }

    @Test
    @DisplayName("Only buy trades — no realized gain")
    void testRealizedGain_onlyBuys() {
        Trade buy = makeTrade(Trade.TradeType.BUY, "BTC", 2.0, 2000000, 24000,
                LocalDateTime.now().minusDays(1));

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "BTC"))
                .thenReturn(List.of(buy));

        Map<String, Object> result = plReportService.calculateRealizedGains(testUser);

        assertThat((BigDecimal) result.get("totalRealizedInr"))
                .isEqualByComparingTo("0.00");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UNREALIZED GAIN TESTS
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Unrealized gain: current price above avg cost — profit")
    void testUnrealizedGain_profit() {
        Holding h = makeHolding("BTC", 1.0, 2000000);

        when(holdingRepository.findByUser(testUser)).thenReturn(List.of(h));
        when(cryptoPriceService.getCurrentPrice("BTC"))
                .thenReturn(BigDecimal.valueOf(2500000));

        Map<String, Object> result = plReportService.calculateUnrealizedGains(testUser);

        // gain = (2500000 - 2000000) * 1 = 500000
        assertThat((BigDecimal) result.get("totalUnrealizedInr"))
                .isEqualByComparingTo("500000.00");
    }

    @Test
    @DisplayName("Unrealized gain: current price below avg cost — loss")
    void testUnrealizedGain_loss() {
        Holding h = makeHolding("ETH", 2.0, 200000);

        when(holdingRepository.findByUser(testUser)).thenReturn(List.of(h));
        when(cryptoPriceService.getCurrentPrice("ETH"))
                .thenReturn(BigDecimal.valueOf(150000));

        Map<String, Object> result = plReportService.calculateUnrealizedGains(testUser);

        // loss = (150000 - 200000) * 2 = -100000
        assertThat((BigDecimal) result.get("totalUnrealizedInr"))
                .isEqualByComparingTo("-100000.00");
    }

    @Test
    @DisplayName("Unrealized gain: no holdings — all zeros")
    void testUnrealizedGain_noHoldings() {
        when(holdingRepository.findByUser(testUser)).thenReturn(List.of());

        Map<String, Object> result = plReportService.calculateUnrealizedGains(testUser);

        assertThat((BigDecimal) result.get("totalUnrealizedInr"))
                .isEqualByComparingTo("0.00");
        assertThat((BigDecimal) result.get("totalInvestedInr"))
                .isEqualByComparingTo("0.00");
        assertThat((List<?>) result.get("breakdown")).isEmpty();
    }

    @Test
    @DisplayName("Unrealized gain: multiple holdings — totals summed correctly")
    void testUnrealizedGain_multipleHoldings() {
        Holding btc = makeHolding("BTC", 1.0, 2000000);
        Holding eth = makeHolding("ETH", 2.0, 150000);

        when(holdingRepository.findByUser(testUser)).thenReturn(List.of(btc, eth));
        when(cryptoPriceService.getCurrentPrice("BTC"))
                .thenReturn(BigDecimal.valueOf(2200000)); // +200000
        when(cryptoPriceService.getCurrentPrice("ETH"))
                .thenReturn(BigDecimal.valueOf(130000));  // -20000 * 2 = -40000

        Map<String, Object> result = plReportService.calculateUnrealizedGains(testUser);

        // total = 200000 - 40000 = 160000
        assertThat((BigDecimal) result.get("totalUnrealizedInr"))
                .isEqualByComparingTo("160000.00");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAX SUMMARY TESTS
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("Tax: 30% applied on positive realized gain")
    void testTaxSummary_taxOnGain() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(10);
        LocalDateTime t2 = LocalDateTime.now();

        Trade buy  = makeTrade(Trade.TradeType.BUY,  "BTC", 1.0, 2000000, 24000, t1);
        Trade sell = makeTrade(Trade.TradeType.SELL, "BTC", 1.0, 2500000, 30000, t2);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "BTC"))
                .thenReturn(List.of(buy, sell));

        Map<String, Object> result = plReportService.getTaxSummary(testUser);

        // gain = 500000, tax = 500000 * 30% = 150000
        assertThat((BigDecimal) result.get("totalRealizedGainInr"))
                .isEqualByComparingTo("500000.00");
        assertThat((BigDecimal) result.get("totalTaxPayableInr"))
                .isEqualByComparingTo("150000.00");
    }

    @Test
    @DisplayName("Tax: 1% TDS deducted on sell value above ₹10,000")
    void testTaxSummary_tdsDeducted() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(5);
        LocalDateTime t2 = LocalDateTime.now();

        Trade buy  = makeTrade(Trade.TradeType.BUY,  "ETH", 1.0, 150000, 1800, t1);
        // sell value = 200000 > 10000, TDS = 1% = 2000
        Trade sell = makeTrade(Trade.TradeType.SELL, "ETH", 1.0, 200000, 2400, t2);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "ETH"))
                .thenReturn(List.of(buy, sell));

        Map<String, Object> result = plReportService.getTaxSummary(testUser);

        assertThat((BigDecimal) result.get("totalTdsDeductedInr"))
                .isEqualByComparingTo("2000.00");
    }

    @Test
    @DisplayName("Tax: no TDS on sell value below ₹10,000")
    void testTaxSummary_noTdsBelowThreshold() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(2);
        LocalDateTime t2 = LocalDateTime.now();

        // sell value = 5000 < 10000 threshold
        Trade buy  = makeTrade(Trade.TradeType.BUY,  "DOGE", 1.0, 4000, 50, t1);
        Trade sell = makeTrade(Trade.TradeType.SELL, "DOGE", 1.0, 5000, 60, t2);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "DOGE"))
                .thenReturn(List.of(buy, sell));

        Map<String, Object> result = plReportService.getTaxSummary(testUser);

        assertThat((BigDecimal) result.get("totalTdsDeductedInr"))
                .isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("Tax: no tax on loss — tax payable is zero, not negative")
    void testTaxSummary_noTaxOnLoss() {
        LocalDateTime t1 = LocalDateTime.now().minusDays(3);
        LocalDateTime t2 = LocalDateTime.now();

        Trade buy  = makeTrade(Trade.TradeType.BUY,  "SOL", 1.0, 15000, 180, t1);
        Trade sell = makeTrade(Trade.TradeType.SELL, "SOL", 1.0, 12000, 144, t2);

        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of(buy, sell));
        when(tradeRepository.findByUserAndAssetSymbolOrderByExecutedAtAsc(testUser, "SOL"))
                .thenReturn(List.of(buy, sell));

        Map<String, Object> result = plReportService.getTaxSummary(testUser);

        assertThat((BigDecimal) result.get("totalTaxPayableInr"))
                .isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("Tax: result contains all required keys and non-blank disclaimer")
    void testTaxSummary_requiredKeys() {
        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of());

        Map<String, Object> result = plReportService.getTaxSummary(testUser);

        assertThat(result).containsKeys(
                "totalRealizedGainInr",
                "totalTaxPayableInr",
                "totalTdsDeductedInr",
                "netTaxAfterTdsInr",
                "taxRate",
                "tdsRate",
                "disclaimer",
                "breakdown");
        assertThat(result.get("disclaimer").toString()).isNotBlank();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FULL SUMMARY TEST
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("getFullSummary: returns realized, unrealized and usdToInrRate keys")
    void testGetFullSummary_hasRequiredKeys() {
        when(tradeRepository.findByUserOrderByExecutedAtDesc(testUser))
                .thenReturn(List.of());
        when(holdingRepository.findByUser(testUser))
                .thenReturn(List.of());

        Map<String, Object> summary = plReportService.getFullSummary(testUser);

        assertThat(summary).containsKeys("realized", "unrealized", "usdToInrRate");
    }
}