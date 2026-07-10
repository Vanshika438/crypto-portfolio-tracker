package com.blockfoliox.backend.service;

import com.blockfoliox.backend.dto.PortfolioPLResponse;
import com.blockfoliox.backend.model.Holding;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;

@Service
public class HoldingService {

    private final CryptoPriceService cryptoPriceService;

    public HoldingService(CryptoPriceService cryptoPriceService) {
        this.cryptoPriceService = cryptoPriceService;
    }

    public PortfolioPLResponse calculatePL(Holding holding) {

        if (holding == null) {
            throw new IllegalArgumentException("Holding cannot be null");
        }

        BigDecimal quantity = holding.getQuantity();
        BigDecimal buyPrice = holding.getBuyPrice();

        if (quantity == null || buyPrice == null) {
            throw new IllegalArgumentException("Holding data is incomplete");
        }

        // Uses /coins/markets — same source as frontend chart and all other endpoints
        BigDecimal currentPrice = cryptoPriceService.getCurrentPriceFromMarket(holding.getAssetName());

        BigDecimal investedAmount = buyPrice.multiply(quantity);
        BigDecimal currentValue   = currentPrice.multiply(quantity);
        BigDecimal profitLoss     = currentValue.subtract(investedAmount);

        BigDecimal profitLossPercent = BigDecimal.ZERO;

        if (investedAmount.compareTo(BigDecimal.ZERO) > 0) {
            profitLossPercent = profitLoss
                    .divide(investedAmount, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        buyPrice          = buyPrice.setScale(2, RoundingMode.HALF_UP);
        currentPrice      = currentPrice.setScale(2, RoundingMode.HALF_UP);
        investedAmount    = investedAmount.setScale(2, RoundingMode.HALF_UP);
        currentValue      = currentValue.setScale(2, RoundingMode.HALF_UP);
        quantity          = quantity.setScale(2, RoundingMode.HALF_UP);
        profitLoss        = profitLoss.setScale(2, RoundingMode.HALF_UP);
        profitLossPercent = profitLossPercent.setScale(2, RoundingMode.HALF_UP);

        PortfolioPLResponse response = new PortfolioPLResponse();
        response.setAssetName(holding.getAssetName());
        response.setBuyPrice(buyPrice);
        response.setCurrentPrice(currentPrice);
        response.setQuantity(quantity);
        response.setProfitLoss(profitLoss);
        response.setProfitLossPercent(profitLossPercent);

        return response;
    }
}