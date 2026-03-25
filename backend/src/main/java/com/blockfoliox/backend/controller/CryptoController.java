package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.service.CryptoPriceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/crypto")

public class CryptoController {

    private final CryptoPriceService cryptoPriceService;

    public CryptoController(CryptoPriceService cryptoPriceService) {
        this.cryptoPriceService = cryptoPriceService;
    }

    @GetMapping("/prices")
    public Map<String, Map<String, Object>> getPrices() {
        return cryptoPriceService.getAllPrices();
    }

    @GetMapping("/market")
    public List<Map<String, Object>> getMarketData() {
        return cryptoPriceService.getAllMarketData();
    }
}