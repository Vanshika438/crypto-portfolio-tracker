package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.dto.PortfolioPLResponse;
import com.blockfoliox.backend.model.Holding;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.HoldingRepository;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.service.CryptoPriceService;
import com.blockfoliox.backend.service.HoldingService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping("/api/holding")
@CrossOrigin
public class HoldingController {

    private final HoldingRepository holdingRepository;
    private final UserRepository userRepository;
    private final HoldingService holdingService;
    private final CryptoPriceService cryptoPriceService;

    public HoldingController(
            HoldingRepository holdingRepository,
            UserRepository userRepository,
            HoldingService holdingService,
            CryptoPriceService cryptoPriceService) {

        this.holdingRepository = holdingRepository;
        this.userRepository = userRepository;
        this.holdingService = holdingService;
        this.cryptoPriceService = cryptoPriceService;
    }

    @PostMapping("/add")
    public ResponseEntity<Holding> addAsset(
            @RequestBody Holding holding,
            Authentication auth) {

        User user = getUser(auth);
        holding.setUser(user);
        return ResponseEntity.ok(holdingRepository.save(holding));
    }

    @GetMapping("/my")
    public List<Holding> getMyHoldings(Authentication auth) {
        return holdingRepository.findByUser(getUser(auth));
    }

    @GetMapping("/{id}/pl")
    public PortfolioPLResponse getHoldingPL(
            @PathVariable Long id,
            Authentication auth) {

        User user = getUser(auth);
        Holding holding = holdingRepository
                .findByIdAndUserEmail(id, user.getEmail())
                .orElseThrow(() -> new RuntimeException("Holding not found"));

        return holdingService.calculatePL(holding);
    }

    @GetMapping("/pl")
    public List<Map<String, Object>> getProfitLoss(Authentication auth) {

        List<Holding> holdings = holdingRepository.findByUser(getUser(auth));
        List<Map<String, Object>> response = new ArrayList<>();

        for (Holding p : holdings) {
            BigDecimal investedValue = p.getQuantity().multiply(p.getBuyPrice());
            BigDecimal currentPrice  = cryptoPriceService.getCurrentPrice(p.getAssetName());
            BigDecimal currentValue  = p.getQuantity().multiply(currentPrice);
            BigDecimal profitLoss    = currentValue.subtract(investedValue);

            BigDecimal profitLossPercent = investedValue.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : profitLoss
                            .divide(investedValue, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100));

            Map<String, Object> data = new HashMap<>();
            data.put("id",                p.getId());
            data.put("assetName",         p.getAssetName());
            data.put("quantity",          p.getQuantity());
            data.put("buyPrice",          p.getBuyPrice());
            data.put("currentPrice",      currentPrice);
            data.put("investedValue",     investedValue);
            data.put("currentValue",      currentValue);
            data.put("profitLoss",        profitLoss);
            data.put("profitLossPercent", profitLossPercent);

            response.add(data);
        }

        return response;
    }

    @GetMapping("/summary")
    public Map<String, Object> getPortfolioSummary(Authentication auth) {

        List<Holding> holdings = holdingRepository.findByUser(getUser(auth));

        BigDecimal totalInvested     = BigDecimal.ZERO;
        BigDecimal totalCurrentValue = BigDecimal.ZERO;

        for (Holding holding : holdings) {
            BigDecimal investedValue = holding.getBuyPrice().multiply(holding.getQuantity());
            BigDecimal currentPrice  = cryptoPriceService.getCurrentPrice(holding.getAssetName());
            BigDecimal currentValue  = holding.getQuantity().multiply(currentPrice);

            totalInvested     = totalInvested.add(investedValue);
            totalCurrentValue = totalCurrentValue.add(currentValue);
        }

        BigDecimal totalProfitLoss   = totalCurrentValue.subtract(totalInvested);
        BigDecimal profitLossPercent = totalInvested.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalProfitLoss
                        .divide(totalInvested, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));

        Map<String, Object> response = new HashMap<>();
        response.put("totalInvested",     totalInvested.setScale(2, RoundingMode.HALF_UP));
        response.put("currentValue",      totalCurrentValue.setScale(2, RoundingMode.HALF_UP));
        response.put("totalProfitLoss",   totalProfitLoss.setScale(2, RoundingMode.HALF_UP));
        response.put("profitLossPercent", profitLossPercent.setScale(2, RoundingMode.HALF_UP));

        return response;
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateAsset(
            @PathVariable Long id,
            @RequestBody Holding updatedHolding,
            Authentication auth) {

        Holding holding = holdingRepository
                .findByIdAndUserEmail(id, auth.getName())
                .orElseThrow(() -> new RuntimeException("Asset not found"));

        holding.setAssetName(updatedHolding.getAssetName());
        holding.setQuantity(updatedHolding.getQuantity());
        holding.setBuyPrice(updatedHolding.getBuyPrice());
        holdingRepository.save(holding);

        return ResponseEntity.ok("Asset updated successfully");
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteAsset(
            @PathVariable Long id,
            Authentication auth) {

        Holding holding = holdingRepository
                .findByIdAndUserEmail(id, auth.getName())
                .orElseThrow(() -> new RuntimeException("Asset not found"));

        holdingRepository.delete(holding);
        return ResponseEntity.ok("Asset deleted successfully");
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}