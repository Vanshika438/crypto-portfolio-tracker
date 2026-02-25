package com.blockfoliox.backend.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioPLResponse {

    private String assetName;

    private BigDecimal buyPrice;

    private BigDecimal currentPrice;

    private BigDecimal quantity;

    private BigDecimal profitLoss;

    private BigDecimal profitLossPercent;
}