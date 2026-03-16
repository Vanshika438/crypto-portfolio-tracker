package com.blockfoliox.backend.repository;

import com.blockfoliox.backend.model.RiskAlert;
import com.blockfoliox.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RiskAlertRepository extends JpaRepository<RiskAlert, Long> {

    List<RiskAlert> findByUserOrderByCreatedAtDesc(User user);

    List<RiskAlert> findByUserAndSeenFalseOrderByCreatedAtDesc(User user);

    boolean existsByUserAndAssetSymbolAndAlertType(
            User user, String assetSymbol, RiskAlert.AlertType alertType);

    long countByUserAndSeenFalse(User user);
}