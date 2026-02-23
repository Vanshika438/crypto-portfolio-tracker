package com.blockfoliox.backend.controller;

import java.time.LocalDateTime;
import java.util.Map;

import com.blockfoliox.backend.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.blockfoliox.backend.model.ApiKey;
import com.blockfoliox.backend.model.Exchange;
import com.blockfoliox.backend.repository.ApiKeyRepository;
import com.blockfoliox.backend.repository.ExchangeRepository;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.security.JwtUtil;
import com.blockfoliox.backend.service.EncryptionService;

@RestController
@RequestMapping("/api/exchange")
public class ExchangeController {

    private final ApiKeyRepository apiKeyRepository;
    private final ExchangeRepository exchangeRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final EncryptionService encryptionService;

    public ExchangeController(
            ApiKeyRepository apiKeyRepository,
            ExchangeRepository exchangeRepository,
            UserRepository userRepository,
            JwtUtil jwtUtil,
            EncryptionService encryptionService) {

        this.apiKeyRepository = apiKeyRepository;
        this.exchangeRepository = exchangeRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.encryptionService = encryptionService;
    }

    @GetMapping
    public ResponseEntity<?> getAllExchanges() {
        return ResponseEntity.ok(exchangeRepository.findAll());
    }

    @PostMapping("/connect")
    public ResponseEntity<?> connectExchange(
            @RequestBody Map<String, String> request,
            org.springframework.security.core.Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!request.containsKey("exchangeId") ||
                !request.containsKey("apiKey") ||
                !request.containsKey("apiSecret")) {
            return ResponseEntity.badRequest().body("Missing required fields");
        }
        Long exchangeId = Long.parseLong(request.get("exchangeId"));
        String apiKey = request.get("apiKey");
        String apiSecret = request.get("apiSecret");
        String label = request.get("label");

        Exchange exchange = exchangeRepository.findById(exchangeId)
                .orElseThrow(() -> new RuntimeException("Exchange not found"));

        if (apiKeyRepository.existsByUserAndExchange(user, exchange)) {
            return ResponseEntity
                    .badRequest()
                    .body("Exchange already connected.");
        }
        ApiKey newKey = new ApiKey();
        newKey.setUser(user);
        newKey.setExchange(exchange);
        newKey.setApiKey(encryptionService.encrypt(apiKey));
        newKey.setApiSecret(encryptionService.encrypt(apiSecret));
        newKey.setLabel(label);
        newKey.setCreatedAt(LocalDateTime.now());
        apiKeyRepository.save(newKey);

        return ResponseEntity.ok("Exchange connected securely.");
    }
}
