package com.blockfoliox.backend.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "risk_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskAlert {

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
    private AlertType alertType;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Builder.Default
    private boolean seen = false;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum AlertType {
        RUGPULL_WARNING,
        CONTRACT_RISK,
        LOW_MARKET_CAP,
        HIGH_VOLATILITY,
        NOT_ON_COINGECKO,
        WATCHLIST_FLAG,
        NEWS
    }
}