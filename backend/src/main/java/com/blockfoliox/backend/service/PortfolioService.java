package com.blockfoliox.backend.service;

import com.blockfoliox.backend.dto.PortfolioPLResponse;
import com.blockfoliox.backend.model.Portfolio;
import org.springframework.stereotype.Service;

@Service
public class PortfolioService {

    private final CryptoPriceService cryptoPriceService;

    public PortfolioService(CryptoPriceService cryptoPriceService) {
        this.cryptoPriceService = cryptoPriceService;
    }

    public PortfolioPLResponse calculatePL(Portfolio portfolio) {

        double currentPrice =
                cryptoPriceService.getCurrentPrice(portfolio.getAssetName());

        double investedAmount =
                portfolio.getBuyPrice() * portfolio.getQuantity();

        double currentValue =
                currentPrice * portfolio.getQuantity();

        double profitLoss =
                currentValue - investedAmount;

        PortfolioPLResponse response = new PortfolioPLResponse();

        response.setAssetName(portfolio.getAssetName());
        response.setBuyPrice(portfolio.getBuyPrice());
        response.setCurrentPrice(currentPrice);
        response.setQuantity(portfolio.getQuantity());
        response.setProfitLoss(profitLoss);

        return response;
    }
}
