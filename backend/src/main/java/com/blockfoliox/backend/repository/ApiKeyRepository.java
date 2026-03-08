package com.blockfoliox.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockfoliox.backend.model.ApiKey;
import com.blockfoliox.backend.model.Exchange;
import com.blockfoliox.backend.model.User;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

    List<ApiKey> findByUser(User user);

    boolean existsByUserAndExchange(User user, Exchange exchange);

    Optional<ApiKey> findByUserAndExchange(User user, Exchange exchange);
}
