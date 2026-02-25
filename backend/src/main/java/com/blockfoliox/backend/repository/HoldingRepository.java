package com.blockfoliox.backend.repository;

import com.blockfoliox.backend.model.Holding;
import com.blockfoliox.backend.model.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;


public interface HoldingRepository extends JpaRepository<Holding, Long> {

    List<Holding> findByUser(User user);
    Optional<Holding> findByIdAndUserEmail(Long id, String email);

    void deleteByUser(User user);

}
