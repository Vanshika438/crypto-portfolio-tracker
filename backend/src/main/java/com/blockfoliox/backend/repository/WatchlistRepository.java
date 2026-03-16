package com.blockfoliox.backend.repository;

import com.blockfoliox.backend.model.Watchlist;
import com.blockfoliox.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {

    List<Watchlist> findByUser(User user);

    Optional<Watchlist> findByUserAndAssetSymbol(User user, String assetSymbol);

    boolean existsByUserAndAssetSymbol(User user, String assetSymbol);
}