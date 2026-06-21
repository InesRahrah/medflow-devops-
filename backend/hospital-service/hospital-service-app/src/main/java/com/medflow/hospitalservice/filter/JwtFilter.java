package com.medflow.hospitalservice.filter;

import com.medflow.hospitalservice.security.JwtClaimsExtractor;
import com.medflow.hospitalservice.security.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final JwtClaimsExtractor jwtClaimsExtractor;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userId;
        final String systemRole;
        final String staffRole;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        if (jwtUtil.validateToken(jwt)) {
            userId = jwtUtil.extractUserId(jwt);
            systemRole = jwtUtil.extractRole(jwt);
            staffRole = jwtUtil.extractClaim(jwt, claims -> (String) claims.get("staffRole"));
            UUID hospitalId = jwtClaimsExtractor.extractHospitalId(jwt);
            request.setAttribute("hospitalId", hospitalId != null ? hospitalId.toString() : null);

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (systemRole != null && !systemRole.isBlank()) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + systemRole.toUpperCase()));
                }
                if (staffRole != null && !staffRole.isBlank()) {
                    String staffAuthority = "ROLE_" + staffRole.toUpperCase();
                    if (authorities.stream().noneMatch(a -> a.getAuthority().equals(staffAuthority))) {
                        authorities.add(new SimpleGrantedAuthority(staffAuthority));
                    }
                }

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userId,
                        null,
                        authorities);

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
