package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.model.Trade;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.HoldingRepository;
import com.blockfoliox.backend.repository.TradeRepository;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.service.PLReportService;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.PrintWriter;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/report")
@CrossOrigin
public class ReportController {

    private final PLReportService   plReportService;
    private final TradeRepository   tradeRepository;
    private final HoldingRepository holdingRepository;
    private final UserRepository    userRepository;

    public ReportController(
            PLReportService plReportService,
            TradeRepository tradeRepository,
            HoldingRepository holdingRepository,
            UserRepository userRepository) {
        this.plReportService   = plReportService;
        this.tradeRepository   = tradeRepository;
        this.holdingRepository = holdingRepository;
        this.userRepository    = userRepository;
    }

    // ── GET /api/report/summary ────────────────────────────────────────────
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(plReportService.getFullSummary(user));
    }

    // ── GET /api/report/tax ────────────────────────────────────────────────
    @GetMapping("/tax")
    public ResponseEntity<?> getTaxSummary(Authentication auth) {
        User user = getUser(auth);
        return ResponseEntity.ok(plReportService.getTaxSummary(user));
    }

    // ── GET /api/report/export/csv ─────────────────────────────────────────
    @GetMapping("/export/csv")
    public void exportCsv(Authentication auth, HttpServletResponse response)
            throws Exception {

        User user = getUser(auth);

        response.setContentType("text/csv");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"blockfoliox_report.csv\"");

        PrintWriter writer    = response.getWriter();
        BigDecimal usdToInr   = plReportService.getUsdToInrRate();

        // ── Section 1: Portfolio Summary ───────────────────────────────────
        writer.println("PORTFOLIO SUMMARY");
        writer.println("Generated," + new java.util.Date());
        writer.println("USD to INR Rate," + usdToInr);
        writer.println();

        Map<String, Object> summary    = plReportService.getFullSummary(user);
        Map<String, Object> unrealized = (Map<String, Object>) summary.get("unrealized");
        Map<String, Object> realized   = (Map<String, Object>) summary.get("realized");

        writer.println("Total Invested (INR),Total Current Value (INR),"
                + "Unrealized Gain INR,Unrealized Gain USD,"
                + "Realized Gain INR,Realized Gain USD");
        writer.println(
                unrealized.get("totalInvestedInr") + ","
                + unrealized.get("totalCurrentInr") + ","
                + unrealized.get("totalUnrealizedInr") + ","
                + unrealized.get("totalUnrealizedUsd") + ","
                + realized.get("totalRealizedInr") + ","
                + realized.get("totalRealizedUsd"));
        writer.println();

        // ── Section 2: Current Holdings ────────────────────────────────────
        writer.println("CURRENT HOLDINGS");
        writer.println("Symbol,Quantity,Avg Cost (INR),Current Price (INR),"
                + "Current Price (USD),Unrealized Gain (INR),"
                + "Unrealized Gain (USD),Gain %");

        List<Map<String, Object>> unrealizedBreakdown =
                (List<Map<String, Object>>) unrealized.get("breakdown");
        for (Map<String, Object> row : unrealizedBreakdown) {
            writer.println(
                    row.get("symbol") + ","
                    + row.get("quantity") + ","
                    + row.get("avgCostInr") + ","
                    + row.get("currentPriceInr") + ","
                    + row.get("currentPriceUsd") + ","
                    + row.get("unrealizedGainInr") + ","
                    + row.get("unrealizedGainUsd") + ","
                    + row.get("gainPercent") + "%");
        }
        writer.println();

        // ── Section 3: Realized Gains (FIFO) ──────────────────────────────
        writer.println("REALIZED GAINS (FIFO)");
        writer.println("Symbol,Realized Gain (INR),Realized Gain (USD)");

        List<Map<String, Object>> realizedBreakdown =
                (List<Map<String, Object>>) realized.get("breakdown");
        for (Map<String, Object> row : realizedBreakdown) {
            writer.println(
                    row.get("symbol") + ","
                    + row.get("realizedGainInr") + ","
                    + row.get("realizedGainUsd"));
        }
        writer.println();

        // ── Section 4: Full Trade History ──────────────────────────────────
        writer.println("TRADE HISTORY");
        writer.println("Date,Symbol,Type,Quantity,Price (INR),Price (USD),"
                + "Fee (INR),Fee (USD),Exchange,Notes");

        List<Trade> trades = tradeRepository.findByUserOrderByExecutedAtDesc(user);
        for (Trade t : trades) {
            writer.println(
                    t.getExecutedAt() + ","
                    + t.getAssetSymbol() + ","
                    + t.getType() + ","
                    + t.getQuantity() + ","
                    + t.getPriceInr() + ","
                    + t.getPriceUsd() + ","
                    + (t.getFeeInr() != null ? t.getFeeInr() : "0") + ","
                    + (t.getFeeUsd() != null ? t.getFeeUsd() : "0") + ","
                    + (t.getExchange() != null ? t.getExchange() : "") + ","
                    + (t.getNotes()    != null ? t.getNotes()    : ""));
        }
        writer.println();

        // ── Section 5: Tax Summary (India) ─────────────────────────────────
        Map<String, Object> tax = plReportService.getTaxSummary(user);

        writer.println("TAX SUMMARY (India — Section 115BBH / 194S)");
        writer.println("Total Realized Gain (INR),Tax Payable @ 30% (INR),"
                + "TDS Already Deducted (INR),Net Tax Still Due (INR)");
        writer.println(
                tax.get("totalRealizedGainInr") + ","
                + tax.get("totalTaxPayableInr") + ","
                + tax.get("totalTdsDeductedInr") + ","
                + tax.get("netTaxAfterTdsInr"));
        writer.println();

        writer.println("Tax Rate," + tax.get("taxRate"));
        writer.println("TDS Rate," + tax.get("tdsRate"));
        writer.println("Disclaimer," + tax.get("disclaimer"));
        writer.println();

        // ── Section 6: Per-symbol Tax Breakdown ────────────────────────────
        writer.println("TAX BREAKDOWN BY SYMBOL");
        writer.println("Symbol,Total Gain (INR),Tax Payable (INR),TDS Deducted (INR)");

        List<Map<String, Object>> taxBreakdown =
                (List<Map<String, Object>>) tax.get("breakdown");
        for (Map<String, Object> row : taxBreakdown) {
            writer.println(
                    row.get("symbol") + ","
                    + row.get("totalGainInr") + ","
                    + row.get("taxPayableInr") + ","
                    + row.get("tdsDeductedInr"));
        }

        writer.flush();
    }

    // ── Utility ────────────────────────────────────────────────────────────
    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}