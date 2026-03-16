package com.blockfoliox.backend.repository;

import com.blockfoliox.backend.model.ScamToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ScamTokenRepository extends JpaRepository<ScamToken, Long> {

    Optional<ScamToken> findByContractAddressIgnoreCase(String contractAddress);

    boolean existsByContractAddressIgnoreCase(String contractAddress);
}