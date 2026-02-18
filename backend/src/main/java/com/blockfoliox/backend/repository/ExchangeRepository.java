package com.blockfoliox.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockfoliox.backend.model.Exchange;

public interface ExchangeRepository extends JpaRepository<Exchange, Long> {

    Optional<Exchange> findByName(String name);
}
