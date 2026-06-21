package com.medflow.blogservice.dto;

import com.medflow.blogservice.entity.enums.Visibility;
import lombok.Data;

@Data
public class RepostRequestDTO {
    private Visibility visibility = Visibility.PUBLIC;
}