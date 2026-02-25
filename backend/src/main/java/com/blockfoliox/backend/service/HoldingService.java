package com.blockfoliox.backend.service;

import com.blockfoliox.backend.dto.PortfolioPLResponse;
import com.blockfoliox.backend.model.Holding;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;


@Service
public class HoldingService {

    private final CryptoPriceService cryptoPriceService;

    public HoldingService(
            CryptoPriceService cryptoPriceService) {

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

        BigDecimal currentPrice = cryptoPriceService.getCurrentPrice(holding.getAssetName());
        BigDecimal investedAmount = buyPrice.multiply(quantity);

        BigDecimal currentValue = currentPrice.multiply(quantity);

        BigDecimal profitLoss = currentValue.subtract(investedAmount);

        BigDecimal profitLossPercent = BigDecimal.ZERO;


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