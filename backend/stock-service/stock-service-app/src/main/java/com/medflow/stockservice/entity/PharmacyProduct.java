package com.medflow.stockservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.medflow.stockservice.entity.enums.DrugForm;
import com.medflow.stockservice.entity.enums.DrugType;
import com.medflow.stockservice.entity.enums.PrescriptionType;
import jakarta.persistence.*;
import lombok.*;
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"stock"})
@Builder
public class PharmacyProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String productName;

    @Enumerated(EnumType.STRING)
    private DrugType type;

    @Enumerated(EnumType.STRING)
    private DrugForm form;

    private String dosage;

    private String manufacturer;

    @Enumerated(EnumType.STRING)
    private PrescriptionType prescriptionType;



    // 🆕 NOTICE DIGITALE
    @Column(length = 2000)
    private String description;

    @Column(length = 2000)
    private String usageInstructions;

    @Column(length = 2000)
    private String warnings;

    private String qrCodeUrl;


    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private PharmacyStock stock;
}
