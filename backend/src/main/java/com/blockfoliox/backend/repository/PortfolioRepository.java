package com.blockfoliox.backend.repository;

import com.blockfoliox.backend.model.Portfolio;
import com.blockfoliox.backend.model.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;


public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {

    List<Portfolio> findByUser(User user);
    Optional<Portfolio> findByIdAndUserEmail(Long id, String email);

}
