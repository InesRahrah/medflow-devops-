package com.medflow.userservice.service.strategy;

import com.medflow.userservice.entity.Role;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class UpdateProfileStrategyFactory {
    private final Map<Role, UpdateProfileStrategy> strategies;

    public UpdateProfileStrategyFactory(List<UpdateProfileStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(UpdateProfileStrategy::getRole, Function.identity()));
    }

    public UpdateProfileStrategy getStrategy(Role role) {
        UpdateProfileStrategy strategy = strategies.get(role);
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported role for profile update: " + role);
        }
        return strategy;
    }
}
