package com.medflow.userservice.service.strategy;

import com.medflow.userservice.entity.Role;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class ProfileStrategyFactory {

    private final Map<Role, ProfileStrategy> strategies;

    public ProfileStrategyFactory(List<ProfileStrategy> strategyList) {
        strategies = strategyList.stream()
                .collect(Collectors.toMap(ProfileStrategy::getRole, Function.identity()));
    }

    public ProfileStrategy getStrategy(Role role) {
        return Optional.ofNullable(strategies.get(role))
                .orElseThrow(() -> new IllegalArgumentException("No profile strategy found for role: " + role));
    }
}
