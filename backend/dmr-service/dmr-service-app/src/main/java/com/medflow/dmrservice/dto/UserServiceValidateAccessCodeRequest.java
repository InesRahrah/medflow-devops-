package com.medflow.dmrservice.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class UserServiceValidateAccessCodeRequest {
    String code;
}
