package com.medflow.stockservice.controller;

import com.medflow.stockservice.service.AiService;
import com.medflow.stockservice.service.OcrService;
import com.medflow.stockservice.service.OpenFdaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ScanController {

    private final OcrService ocrService;
    private final AiService aiService;
    private final OpenFdaService openFdaService;

    // 📸 OCR simple
    @PostMapping("/ocr")
    public String scan(@RequestBody Map<String, String> body) {

        String image = body.get("image");

        return ocrService.extractText(image);
    }

    // 🧠 OCR + AI
    @PostMapping("/scan-and-explain")
    public String scanAndExplain(@RequestBody Map<String, String> body) {

        String image = body.get("image");

        // 1️⃣ OCR
        String text = ocrService.extractText(image);

        // 2️⃣ Extract drug name via AI (IMPORTANT)
        String drugName = aiService.askAI(
                "Extract ONLY the drug name from this text:\n" + text
        ).replaceAll("[^a-zA-Z0-9 ]", "").trim();

        // 3️⃣ FDA INFO
        String fdaInfo = openFdaService.getDrugInfo(drugName);

        // 4️⃣ 🔥 SMART PROMPT
        String prompt = """
You are a professional pharmacist.

You must provide a COMPLETE medical analysis.

Rules:
- Do NOT rely only on the image text
- Use your medical knowledge + FDA data
- Be detailed but clear

Provide:

1. Drug Name
2. Dosage
3. Purpose
4. Usage Instructions
5. Side Effects
6. Contraindications
7. Drug Interactions
8. Precautions
9. Alternatives (if possible)

Image OCR text:
""" + text + """

FDA DATA:
""" + fdaInfo;

        // 5️⃣ AI RESPONSE
        return aiService.askAI(prompt);
    }
}
