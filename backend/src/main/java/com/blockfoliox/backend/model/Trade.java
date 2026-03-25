package com.blockfoliox.backend.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "trades",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "exchange", "assetSymbol", "executedAt", "type"})
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String assetSymbol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TradeType type;

    @Column(nullable = false, precision = 19, scale = 8)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal priceInr;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal priceUsd;

    @Column(precision = 19, scale = 2)
    private BigDecimal feeInr;

    @Column(precision = 19, scale = 2)
    private BigDecimal feeUsd;

    private String exchange;
    private String notes;

    @Column(nullable = false)
    private LocalDateTime executedAt;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.executedAt == null) {
            this.executedAt = LocalDateTime.now();
        }
    }

    public enum TradeType {
        BUY, SELL
    }
}