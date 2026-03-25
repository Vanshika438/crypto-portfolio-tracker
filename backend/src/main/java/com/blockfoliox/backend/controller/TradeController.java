package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.model.Trade;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.TradeRepository;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.service.BinanceSyncService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trades")

public class TradeController {

    private final TradeRepository tradeRepository;
    private final UserRepository userRepository;
    private final BinanceSyncService binanceSyncService;

    public TradeController(
            TradeRepository tradeRepository,
            UserRepository userRepository,
            BinanceSyncService binanceSyncService) {
        this.tradeRepository    = tradeRepository;
        this.userRepository     = userRepository;
        this.binanceSyncService = binanceSyncService;
    }

    // GET /api/trades — all trades for user
    @GetMapping
    public List<Trade> getTrades(Authentication auth) {
        return tradeRepository.findByUserOrderByExecutedAtDesc(getUser(auth));
    }

    // POST /api/trades — manual add
    @PostMapping
    public ResponseEntity<Trade> addTrade(
            @RequestBody Trade trade,
            Authentication auth) {

        trade.setUser(getUser(auth));
        return ResponseEntity.ok(tradeRepository.save(trade));
    }

    // PUT /api/trades/{id} — edit trade
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTrade(
            @PathVariable Long id,
            @RequestBody Trade updated,
            Authentication auth) {

        User user = getUser(auth);
        Trade trade = tradeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trade not found"));

        if (!trade.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        trade.setAssetSymbol(updated.getAssetSymbol());
        trade.setType(updated.getType());
        trade.setQuantity(updated.getQuantity());
        trade.setPriceInr(updated.getPriceInr());
        trade.setPriceUsd(updated.getPriceUsd());
        trade.setFeeInr(updated.getFeeInr());
        trade.setFeeUsd(updated.getFeeUsd());
        trade.setExchange(updated.getExchange());
        trade.setNotes(updated.getNotes());
        trade.setExecutedAt(updated.getExecutedAt());

        return ResponseEntity.ok(tradeRepository.save(trade));
    }

    // DELETE /api/trades/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTrade(
            @PathVariable Long id,
            Authentication auth) {

        User user = getUser(auth);
        Trade trade = tradeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trade not found"));

        if (!trade.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        tradeRepository.delete(trade);
        return ResponseEntity.ok(Map.of("message", "Trade deleted"));
    }

    // POST /api/trades/sync/binance — sync from Binance
    @PostMapping("/sync/binance")
    public ResponseEntity<?> syncFromBinance(Authentication auth) {
        User user = getUser(auth);
        List<Trade> synced = binanceSyncService.syncTrades(user);
        return ResponseEntity.ok(Map.of(
                "message", "Synced " + synced.size() + " trades from Binance",
                "trades",  synced));
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}