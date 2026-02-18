package com.blockfoliox.backend.model;

import java.time.LocalDateTime;
import lombok.*;
import jakarta.persistence.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Exchange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String baseUrl;

    private LocalDateTime createdAt;
}
