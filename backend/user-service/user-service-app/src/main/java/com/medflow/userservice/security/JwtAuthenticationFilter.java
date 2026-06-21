package com.medflow.userservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.medflow.userservice.entity.User;
import com.medflow.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userId;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            jwt = authHeader.substring(7);
            userId = jwtService.extractUserId(jwt);

            if (userId == null) {
                filterChain.doFilter(request, response);
                return;
            }

            UUID uuid;
            try {
                uuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid UUID in JWT subject: {}", userId);
                filterChain.doFilter(request, response);
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                User user = userRepository.findById(uuid).orElse(null);
                if (user == null) {
                    filterChain.doFilter(request, response);
                    return;
                }

                if (jwtService.isTokenValid(jwt, user)) {
                    String staffRole = jwtService.extractClaim(jwt, claims -> claims.get("staffRole", String.class));
                    String systemRole = jwtService.extractClaim(jwt, claims -> claims.get("role", String.class));
                    String hospitalId = jwtService.extractClaim(jwt, claims -> claims.get("hospitalId", String.class));
                    request.setAttribute("hospitalId", hospitalId);
                    List<GrantedAuthority> authorities = new ArrayList<>(user.getAuthorities());
                    if (systemRole != null && !systemRole.isBlank()) {
                        String role = "ROLE_" + systemRole.toUpperCase();
                        if (authorities.stream().noneMatch(a -> a.getAuthority().equals(role))) {
                            authorities.add(new SimpleGrantedAuthority(role));
                        }
                    }
                    if (staffRole != null) {
                        String role = "ROLE_" + staffRole.toUpperCase();
                        if (authorities.stream().noneMatch(a -> a.getAuthority().equals(role))) {
                            authorities.add(new SimpleGrantedAuthority(role));
                        }
                    }

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            authorities);
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception ex) {
            logger.debug("JWT authentication failed: {}", ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
