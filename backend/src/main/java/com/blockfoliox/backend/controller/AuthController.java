package com.blockfoliox.backend.controller;

import com.blockfoliox.backend.model.User;
import com.blockfoliox.backend.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.blockfoliox.backend.security.JwtUtil;
import java.util.HashMap;
import java.util.Map;

import java.util.Optional;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public Map<String,String> register(@RequestBody User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail());

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        response.put("email", user.getEmail());

        return response;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody User loginUser) {

        Optional<User> optionalUser = userRepository.findByEmail(loginUser.getEmail());

        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Invalid Email or Password");
        }

        User user = optionalUser.get();

        if (!passwordEncoder.matches(loginUser.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid Email or Password");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        Map<String, String> response = new HashMap<>();
        response.put("token", token);
        response.put("email", user.getEmail());

        return response;
    }

    @GetMapping("/test")
    public String test() {
        return "Test is Working";
    }
    

}
