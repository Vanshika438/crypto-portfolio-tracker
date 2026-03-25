package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.model.RiskAlert;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.model.Watchlist;
import com.blockfoliox.backend.repository.RiskAlertRepository;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.repository.WatchlistRepository;
import com.blockfoliox.backend.service.RiskDetectionService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/risk")

public class RiskAlertController {

    private final RiskAlertRepository riskAlertRepository;
    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final RiskDetectionService riskDetectionService;

    public RiskAlertController(
            RiskAlertRepository riskAlertRepository,
            WatchlistRepository watchlistRepository,
            UserRepository userRepository,
            RiskDetectionService riskDetectionService) {

        this.riskAlertRepository  = riskAlertRepository;
        this.watchlistRepository  = watchlistRepository;
        this.userRepository       = userRepository;
        this.riskDetectionService = riskDetectionService;
    }

    // GET /api/risk/alerts — all alerts for user
    @GetMapping("/alerts")
    public List<RiskAlert> getAlerts(Authentication auth) {
        User user = getUser(auth);
        return riskAlertRepository.findByUserOrderByCreatedAtDesc(user);
    }

    // GET /api/risk/alerts/unread — only unseen alerts
    @GetMapping("/alerts/unread")
    public List<RiskAlert> getUnreadAlerts(Authentication auth) {
        User user = getUser(auth);
        return riskAlertRepository.findByUserAndSeenFalseOrderByCreatedAtDesc(user);
    }

    // GET /api/risk/alerts/count — unread count (for notification badge)
    @GetMapping("/alerts/count")
    public Map<String, Long> getUnreadCount(Authentication auth) {
        User user = getUser(auth);
        return Map.of("unread", riskAlertRepository.countByUserAndSeenFalse(user));
    }

    // PATCH /api/risk/alerts/{id}/seen — mark one alert as seen
    @PatchMapping("/alerts/{id}/seen")
    public ResponseEntity<?> markSeen(@PathVariable Long id, Authentication auth) {
        User user = getUser(auth);
        RiskAlert alert = riskAlertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found"));

        if (!alert.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        alert.setSeen(true);
        riskAlertRepository.save(alert);
        return ResponseEntity.ok(Map.of("message", "Marked as seen"));
    }

    // PATCH /api/risk/alerts/seen-all — mark all alerts as seen
    @PatchMapping("/alerts/seen-all")
    public ResponseEntity<?> markAllSeen(Authentication auth) {
        User user = getUser(auth);
        List<RiskAlert> unread = riskAlertRepository
                .findByUserAndSeenFalseOrderByCreatedAtDesc(user);
        unread.forEach(a -> a.setSeen(true));
        riskAlertRepository.saveAll(unread);
        return ResponseEntity.ok(Map.of("message", "All alerts marked as seen"));
    }

    // POST /api/risk/scan — manually trigger a scan for current user
    @PostMapping("/scan")
    public List<RiskAlert> triggerScan(Authentication auth) {
        User user = getUser(auth);
        return riskDetectionService.scanUserHoldings(user);
    }

    // GET /api/risk/watchlist — get user's watchlist
    @GetMapping("/watchlist")
    public List<Watchlist> getWatchlist(Authentication auth) {
        return watchlistRepository.findByUser(getUser(auth));
    }

    // POST /api/risk/watchlist — add to watchlist
    @PostMapping("/watchlist")
    public ResponseEntity<?> addToWatchlist(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        User user = getUser(auth);
        String symbol = body.get("assetSymbol");

        if (symbol == null || symbol.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "assetSymbol is required"));
        }

        if (watchlistRepository.existsByUserAndAssetSymbol(user, symbol.toUpperCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Already on watchlist"));
        }

        Watchlist entry = Watchlist.builder()
                .user(user)
                .assetSymbol(symbol.toUpperCase())
                .note(body.get("note"))
                .build();

        return ResponseEntity.ok(watchlistRepository.save(entry));
    }

    // DELETE /api/risk/watchlist/{id} — remove from watchlist
    @DeleteMapping("/watchlist/{id}")
    public ResponseEntity<?> removeFromWatchlist(
            @PathVariable Long id,
            Authentication auth) {

        User user = getUser(auth);
        Watchlist entry = watchlistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Watchlist entry not found"));

        if (!entry.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }

        watchlistRepository.delete(entry);
        return ResponseEntity.ok(Map.of("message", "Removed from watchlist"));
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}