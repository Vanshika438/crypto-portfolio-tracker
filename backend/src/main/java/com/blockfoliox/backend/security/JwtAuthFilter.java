package com.blockfoliox.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        try {
            String path = request.getServletPath();

            if (path.startsWith("/api/auth")) {
                filterChain.doFilter(request, response);
                return;
            }

            String authHeader = request.getHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {

                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                if (email != null &&
                        SecurityContextHolder.getContext().getAuthentication() == null &&
                        jwtUtil.validateToken(token, email)) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    Collections.emptyList()
                            );

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            // Token expired — log at debug level, not an error
            log.debug("JWT token expired for request [{}]: {}", request.getServletPath(), e.getMessage());

        } catch (io.jsonwebtoken.MalformedJwtException | io.jsonwebtoken.security.SecurityException e) {
            // Invalid/tampered token — log at warn level
            log.warn("Invalid JWT token for request [{}]: {}", request.getServletPath(), e.getMessage());

        } catch (Exception e) {
            // Unexpected error — log at error level but WITHOUT stack trace in message
            log.error("JWT authentication failed for request [{}]: {}", request.getServletPath(), e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}