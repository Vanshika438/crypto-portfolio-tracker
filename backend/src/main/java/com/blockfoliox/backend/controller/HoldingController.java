package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.dto.PortfolioPLResponse;
import com.blockfoliox.backend.model.Holding;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.HoldingRepository;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.security.JwtUtil;
import com.blockfoliox.backend.service.CryptoPriceService;
import com.blockfoliox.backend.service.HoldingService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping("/api/holding")
@CrossOrigin
public class HoldingController {

        private final HoldingRepository holdingRepository;
        private final UserRepository userRepository;
        private final JwtUtil jwtUtil;
        private final HoldingService holdingService;
        private final CryptoPriceService cryptoPriceService;

        public HoldingController(
                        HoldingRepository holdingRepository,
                        UserRepository userRepository,
                        JwtUtil jwtUtil,
                        HoldingService holdingService,
                        CryptoPriceService cryptoPriceService) {

                this.holdingRepository = holdingRepository;
                this.userRepository = userRepository;
                this.jwtUtil = jwtUtil;
                this.holdingService = holdingService;
                this.cryptoPriceService = cryptoPriceService;
        }

        @PostMapping("/add")
        public ResponseEntity<Holding> addAsset(
                        @RequestBody Holding holding,
                        org.springframework.security.core.Authentication auth) {

                User user = userRepository.findByEmail(auth.getName())
                                .orElseThrow(() -> new RuntimeException("User not found"));
                holding.setUser(user);
                return ResponseEntity.ok(holdingRepository.save(holding));
        }

        @GetMapping("/my")
        public List<Holding> getMyHoldings(
                        @RequestHeader("Authorization") String authHeader) {

                User user = getUserFromToken(authHeader);
                return holdingRepository.findByUser(user);
        }

        @GetMapping("/{id}/pl")
        public PortfolioPLResponse getHoldingPL(
                        @PathVariable Long id,
                        @RequestHeader("Authorization") String authHeader) {

                User user = getUserFromToken(authHeader);

                Holding holding = holdingRepository
                                .findByIdAndUserEmail(id, user.getEmail())
                                .orElseThrow(() -> new RuntimeException("Holding not found"));

                return holdingService.calculatePL(holding);
        }

        @GetMapping("/pl")
        public List<Map<String, Object>> getProfitLoss(
                        @RequestHeader("Authorization") String authHeader) {

                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                List<Holding> holdings = holdingRepository.findByUser(user);

                List<Map<String, Object>> response = new ArrayList<>();

                for (Holding p : holdings) {
                        BigDecimal investedValue = p.getQuantity().multiply(p.getBuyPrice());
                        BigDecimal currentPrice = cryptoPriceService.getCurrentPrice(p.getAssetName());
                        BigDecimal currentValue = p.getQuantity().multiply(currentPrice);
                        BigDecimal profitLoss = currentValue.subtract(investedValue);
                        BigDecimal profitLossPercent = investedValue == BigDecimal.ZERO ? BigDecimal.ZERO
                                        : profitLoss
                                                        .divide(investedValue, 4, RoundingMode.HALF_UP)
                                                        .multiply(BigDecimal.valueOf(100));
                        ;

                        Map<String, Object> data = new HashMap<>();
                        data.put("id", p.getId());
                        data.put("assetName", p.getAssetName());
                        data.put("quantity", p.getQuantity());
                        data.put("buyPrice", p.getBuyPrice());
                        data.put("currentPrice", currentPrice);
                        data.put("investedValue", investedValue);
                        data.put("currentValue", currentValue);
                        data.put("profitLoss", profitLoss);
                        data.put("profitLossPercent", profitLossPercent);

                        response.add(data);
                }

                return response;
        }

        @GetMapping("/summary")
        public Map<String, Object> getPortfolioSummary(
                        @RequestHeader("Authorization") String authHeader) {

                User user = getUserFromToken(authHeader);
                List<Holding> holdings = holdingRepository.findByUser(user);

                BigDecimal totalInvested = BigDecimal.ZERO;
                BigDecimal totalCurrentValue = BigDecimal.ZERO;

                for (Holding holding : holdings) {

                        BigDecimal investedValue = holding.getBuyPrice().multiply(holding.getQuantity());

                        BigDecimal currentPrice = cryptoPriceService.getCurrentPrice(holding.getAssetName());

                        BigDecimal currentValue = holding.getQuantity().multiply(currentPrice);

                        totalInvested = totalInvested.add(investedValue);
                        totalCurrentValue = totalCurrentValue.add(currentValue);
                }

                BigDecimal totalProfitLoss = totalCurrentValue.subtract(totalInvested);

                BigDecimal profitLossPercent = totalInvested.compareTo(BigDecimal.ZERO) == 0
                                ? BigDecimal.ZERO
                                : totalProfitLoss
                                                .divide(totalInvested, 4, RoundingMode.HALF_UP)
                                                .multiply(BigDecimal.valueOf(100));

                Map<String, Object> response = new HashMap<>();
                response.put("totalInvested", totalInvested.setScale(2, RoundingMode.HALF_UP));
                response.put("currentValue", totalCurrentValue.setScale(2, RoundingMode.HALF_UP));
                response.put("totalProfitLoss", totalProfitLoss.setScale(2, RoundingMode.HALF_UP));
                response.put("profitLossPercent", profitLossPercent.setScale(2, RoundingMode.HALF_UP));

                return response;
        }

        @PutMapping("/update/{id}")
        public ResponseEntity<?> updateAsset(
                        @PathVariable Long id,
                        @RequestBody Holding updatedHolding,
                        HttpServletRequest request) {

                String token = request.getHeader("Authorization").substring(7);
                String email = jwtUtil.extractEmail(token);

                Holding holding = holdingRepository
                                .findByIdAndUserEmail(id, email)
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
                        HttpServletRequest request) {

                String token = request.getHeader("Authorization").substring(7);
                String email = jwtUtil.extractEmail(token);

                Holding holding = holdingRepository
                                .findByIdAndUserEmail(id, email)
                                .orElseThrow(() -> new RuntimeException("Asset not found"));

                holdingRepository.delete(holding);

                return ResponseEntity.ok("Asset deleted successfully");
        }

        private User getUserFromToken(String authHeader) {
                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                return userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));
        }

}
