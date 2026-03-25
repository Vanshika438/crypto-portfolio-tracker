package com.blockfoliox.backend.repository;

import com.blockfoliox.backend.model.Trade;
import com.blockfoliox.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long> {

    List<Trade> findByUserOrderByExecutedAtDesc(User user);

    List<Trade> findByUserAndAssetSymbolOrderByExecutedAtAsc(User user, String assetSymbol);

    List<Trade> findByUserAndAssetSymbol(User user, String assetSymbol);

    void deleteByUser(User user);

    // Used by BinanceSyncService to prevent duplicate trades on re-sync
    boolean existsByUserAndExchangeAndAssetSymbolAndExecutedAtAndType(
            User user,
            String exchange,
            String assetSymbol,
            LocalDateTime executedAt,
            Trade.TradeType type);
}