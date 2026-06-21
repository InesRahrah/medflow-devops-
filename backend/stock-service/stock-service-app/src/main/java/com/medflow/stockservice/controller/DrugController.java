package com.medflow.stockservice.controller;

import com.medflow.stockservice.entity.PharmacyProduct;
import com.medflow.stockservice.repository.PharmacyProductRepository;
import com.medflow.stockservice.service.AiService;
import com.medflow.stockservice.service.QrCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/drugs")
@RequiredArgsConstructor
@CrossOrigin("*")
public class DrugController {

    private final PharmacyProductRepository repository;
    private final AiService aiService;
    private final QrCodeService qrCodeService;

    // 📄 GET DRUG INFO
    @GetMapping("/{id}")
    public PharmacyProduct getDrug(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Drug not found"));
    }

    // 🧠 AI NOTICE (🔥 IMPORTANT)
    @GetMapping("/{id}/ai-notice")
    public String getAiNotice(@PathVariable Long id) {

        PharmacyProduct product = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Drug not found"));

        String prompt = """
You are a professional pharmacist.

Generate a COMPLETE medical leaflet.

Include:
- Drug name
- Description
- Composition
- Indications
- Dosage
- Contraindications
- Side effects
- Precautions
- Storage instructions

Format clearly with titles and bullet points.

Drug:
Name: """ + product.getProductName() + """
Dosage: """ + product.getDosage() + """
Type: """ + product.getType();

        return aiService.askAI(prompt);
    }

    // 🔗 GENERATE QR URL
    @PostMapping("/{id}/generate-qr")
    public PharmacyProduct generateQr(@PathVariable Long id) {

        PharmacyProduct product = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Drug not found"));

        String qrUrl = qrCodeService.generateQrUrl(id);

        product.setQrCodeUrl(qrUrl);

        return repository.save(product);
    }
}
