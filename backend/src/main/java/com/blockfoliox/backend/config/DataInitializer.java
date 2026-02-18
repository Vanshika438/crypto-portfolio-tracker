package com.blockfoliox.backend.config;

import java.time.LocalDateTime;

import org.springframework.stereotype.Component;

import com.blockfoliox.backend.model.Exchange;
import com.blockfoliox.backend.repository.ExchangeRepository;

import jakarta.annotation.PostConstruct;

@Component
public class DataInitializer {

    private final ExchangeRepository exchangeRepository;

    public DataInitializer(ExchangeRepository exchangeRepository) {
        this.exchangeRepository = exchangeRepository;
    }

    @PostConstruct
    public void init() {
        if (exchangeRepository.findByName("Binance").isEmpty()) {
            Exchange binance = new Exchange();
            binance.setName("Binance");
            binance.setBaseUrl("https://api.binance.com");
            binance.setCreatedAt(LocalDateTime.now());
            exchangeRepository.save(binance);
        }
    }
}

