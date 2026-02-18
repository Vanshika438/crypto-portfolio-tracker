package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.dto.PortfolioPLResponse;
import com.blockfoliox.backend.model.Portfolio;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.PortfolioRepository;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.security.JwtUtil;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.blockfoliox.backend.service.CryptoPriceService;
import com.blockfoliox.backend.service.PortfolioService;

import jakarta.servlet.http.HttpServletRequest;

import java.util.*;

@RestController
@RequestMapping("/api/portfolio")
@CrossOrigin
public class PortfolioController {

        private final PortfolioRepository portfolioRepository;
        private final UserRepository userRepository;
        private final JwtUtil jwtUtil;

        private final CryptoPriceService cryptoPriceService;
        private final PortfolioService portfolioService;

        public PortfolioController(
                        PortfolioRepository portfolioRepository,
                        UserRepository userRepository,
                        JwtUtil jwtUtil,
                        CryptoPriceService cryptoPriceService,
                        PortfolioService portfolioService) {

                this.portfolioRepository = portfolioRepository;
                this.userRepository = userRepository;
                this.jwtUtil = jwtUtil;
                this.cryptoPriceService = cryptoPriceService;
                this.portfolioService = portfolioService;
        }

        // Add asset
        @PostMapping("/add")
        public Portfolio addAsset(
                        @RequestBody Portfolio portfolio,
                        @RequestHeader("Authorization") String authHeader) {

                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                portfolio.setUser(user);
                return portfolioRepository.save(portfolio);
        }

        // Get my portfolio
        @GetMapping("/my")
        public List<Portfolio> getMyPortfolio(
                        @RequestHeader("Authorization") String authHeader) {

                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return portfolioRepository.findByUser(user);
        }

        @GetMapping("/pl")
        public List<Map<String, Object>> getProfitLoss(
                        @RequestHeader("Authorization") String authHeader) {

                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                List<Portfolio> portfolios = portfolioRepository.findByUser(user);

                List<Map<String, Object>> response = new ArrayList<>();

                for (Portfolio p : portfolios) {
                        double investedValue = p.getQuantity() * p.getBuyPrice();
                        double currentPrice = cryptoPriceService.getCurrentPrice(p.getAssetName());
                        double currentValue = p.getQuantity() * currentPrice;
                        double profitLoss = currentValue - investedValue;
                        double profitLossPercent = investedValue == 0 ? 0 : (profitLoss / investedValue) * 100;

                        Map<String, Object> data = new HashMap<>();
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

                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                List<Portfolio> portfolios = portfolioRepository.findByUser(user);

                double totalInvested = 0;
                double currentValue = 0;

                for (Portfolio p : portfolios) {
                        double invested = p.getQuantity() * p.getBuyPrice();
                        double currentPrice = cryptoPriceService.getCurrentPrice(p.getAssetName());

                        totalInvested += invested;
                        currentValue += p.getQuantity() * currentPrice;
                }

                double totalProfitLoss = currentValue - totalInvested;
                double profitLossPercent = totalInvested == 0 ? 0 : (totalProfitLoss / totalInvested) * 100;

                Map<String, Object> response = new HashMap<>();
                response.put("totalInvested", totalInvested);
                response.put("currentValue", currentValue);
                response.put("totalProfitLoss", totalProfitLoss);
                response.put("profitLossPercent", profitLossPercent);

                return response;
        }

        @GetMapping("/{id}/pl")
        public PortfolioPLResponse getProfitLoss(
                        @PathVariable Long id,
                        @RequestParam double currentPrice) {
                Portfolio portfolio = portfolioRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Portfolio not found"));

                return portfolioService.calculatePL(portfolio);
        }

        @PutMapping("/update/{id}")
        public ResponseEntity<?> updateAsset(
                        @PathVariable Long id,
                        @RequestBody Portfolio updatedPortfolio,
                        HttpServletRequest request) {
                String token = request.getHeader("Authorization").substring(7);
                String email = jwtUtil.extractEmail(token);

                Portfolio portfolio = portfolioRepository
                                .findByIdAndUserEmail(id, email)
                                .orElseThrow(() -> new RuntimeException("Asset not found"));

                portfolio.setAssetName(updatedPortfolio.getAssetName());
                portfolio.setQuantity(updatedPortfolio.getQuantity());
                portfolio.setBuyPrice(updatedPortfolio.getBuyPrice());

                portfolioRepository.save(portfolio);

                return ResponseEntity.ok("Asset updated successfully");
        }

        @DeleteMapping("/delete/{id}")
        public ResponseEntity<?> deleteAsset(
                        @PathVariable Long id,
                        HttpServletRequest request) {
                String token = request.getHeader("Authorization").substring(7);
                String email = jwtUtil.extractEmail(token);

                Portfolio portfolio = portfolioRepository
                                .findByIdAndUserEmail(id, email)
                                .orElseThrow(() -> new RuntimeException("Asset not found"));

                portfolioRepository.delete(portfolio);

                return ResponseEntity.ok("Asset deleted successfully");
        }

}
