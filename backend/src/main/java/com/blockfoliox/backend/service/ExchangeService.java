package com.blockfoliox.backend.service;

import com.blockfoliox.backend.model.Exchange;
import com.blockfoliox.backend.model.Holding;
import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.ApiKeyRepository;
import com.blockfoliox.backend.repository.HoldingRepository;
import com.blockfoliox.backend.service.CryptoPriceService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class ExchangeService {

    private final HoldingRepository holdingRepository;
    private final CryptoPriceService cryptoPriceService;
    private final ApiKeyRepository apiKeyRepository;

    public ExchangeService(HoldingRepository holdingRepository,
            CryptoPriceService cryptoPriceService,
            ApiKeyRepository apiKeyRepository) {
        this.holdingRepository = holdingRepository;
        this.cryptoPriceService = cryptoPriceService;
        this.apiKeyRepository = apiKeyRepository;
    }

    @Transactional
    public List<Holding> syncHoldings(User user, Exchange exchange) {

        boolean connected = apiKeyRepository
                .existsByUserAndExchange(user, exchange);

        if (connected) {
            System.out.println("Exchange connected → real sync (not implemented)");
            return holdingRepository.findByUser(user);
        } else {
            System.out.println("Exchange not connected → mock sync");
            return syncMockHoldings(user);
        }
    }

    @Transactional
    public List<Holding> syncMockHoldings(User user) {

        List<Holding> updatedHoldings = new ArrayList<>();
        Random random = new Random(user.getId());

        String[] coins = { "BTC", "ETH", "SOL", "ADA", "DOGE" };

        for (String coin : coins) {

            BigDecimal quantity = BigDecimal.valueOf(0.3 + random.nextDouble() * 2);
            BigDecimal marketPrice = cryptoPriceService.getCurrentPrice(coin);

            BigDecimal variation = BigDecimal.valueOf(
                    0.9 + (random.nextDouble() * 0.2));

            BigDecimal buyPrice = marketPrice.multiply(variation);

            buyPrice = buyPrice.setScale(2, RoundingMode.HALF_UP);
            quantity = quantity.setScale(2, RoundingMode.HALF_UP);

            Holding holding = holdingRepository
                    .findByUserAndAssetName(user, coin)
                    .orElse(new Holding());

            holding.setUser(user);
            holding.setAssetName(coin);
            holding.setQuantity(quantity);
            holding.setBuyPrice(buyPrice);
            holding.setCreatedAt(LocalDateTime.now());

            updatedHoldings.add(holding);
        }

        return holdingRepository.saveAll(updatedHoldings);
    }
}