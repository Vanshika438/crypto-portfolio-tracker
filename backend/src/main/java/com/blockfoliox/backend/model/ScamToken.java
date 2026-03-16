package com.blockfoliox.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scam_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScamToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String contractAddress;

    @Column(nullable = false)
    private String chain;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RiskLevel riskLevel;

    private String source;

    private LocalDateTime lastSeen;

    public enum RiskLevel {
        LOW, MEDIUM, HIGH
    }
}