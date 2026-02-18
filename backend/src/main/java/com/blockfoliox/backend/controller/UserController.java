package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.UserRepository;
import com.blockfoliox.backend.security.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin
public class UserController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public UserController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/me")
    public Map<String, Object> getLoggedInUser(
            @RequestHeader("Authorization") String authHeader) {

        // Remove "Bearer "
        String token = authHeader.substring(7);

        String email = jwtUtil.extractEmail(token);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Response without password
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("createdAt", user.getCreatedAt());

        return response;
    }
}
