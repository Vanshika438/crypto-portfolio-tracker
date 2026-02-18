package com.blockfoliox.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;


@Entity
@Table(name = "portfolios")
public class Portfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String assetName;     // BTC, ETH
    private double quantity;      // 0.5, 2.3
    private double buyPrice;      // price at purchase

    private LocalDateTime createdAt = LocalDateTime.now();

    // Many portfolio entries belong to ONE user
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // getters & setters
    public Long getId() { return id; }

    public String getAssetName() { return assetName; }
    public void setAssetName(String assetName) { this.assetName = assetName; }

    public double getQuantity() { return quantity; }
    public void setQuantity(double quantity) { this.quantity = quantity; }

    public double getBuyPrice() { return buyPrice; }
    public void setBuyPrice(double buyPrice) { this.buyPrice = buyPrice; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
