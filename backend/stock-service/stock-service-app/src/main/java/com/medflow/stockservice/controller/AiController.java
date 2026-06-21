package com.medflow.stockservice.controller;

import com.medflow.stockservice.entity.PharmacyStock;
import com.medflow.stockservice.repository.PharmacyStockRepository;
import com.medflow.stockservice.service.AiService;
import com.medflow.stockservice.service.OpenFdaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final PharmacyStockRepository stockRepository;
    private final OpenFdaService openFdaService;

    @PostMapping("/chat")
    public String chat(@RequestBody String question) {

        try {
            // 🔥 Nettoyage
            question = question.replace("\"", "").trim().toLowerCase();

            // 🔥 PROMPT GLOBAL (IMPORTANT 🔥)
            String baseInstructions = """
You are an intelligent pharmacy assistant.

Always format your answers like this:
- Use clear titles
- Use bullet points
- Add spacing between sections
- Keep answers short and readable
- Highlight important words using **bold**

Respond professionally.
""";

            // 🔥 CAS 1 : MEDICAMENT
            if (question.contains("explain")) {

                String drugName = question.replace("explain", "").trim();

                if (drugName.isEmpty()) {
                    return "⚠️ Please provide a drug name (ex: Explain Aspirin)";
                }

                String drugInfo = openFdaService.getDrugInfo(drugName);

                String prompt = baseInstructions + """

Explain this drug for a pharmacist:

""" + drugInfo;

                return aiService.askAI(prompt);
            }

            // 🔥 CAS 2 : STOCK
            List<PharmacyStock> stocks = stockRepository.findAll();

            if (stocks.isEmpty()) {
                return "⚠️ No stock data available";
            }

            StringBuilder stockData = new StringBuilder();

            for (PharmacyStock stock : stocks) {
                stockData.append("- Product: ")
                        .append(stock.getProduct().getProductName())
                        .append(", Quantity: ")
                        .append(stock.getAvailableQuantity())
                        .append(", Expiration: ")
                        .append(stock.getExpirationDate())
                        .append("\n");
            }

            String prompt = baseInstructions + """

Here is the pharmacy stock:

""" + stockData + """

User question:
""" + question + """

Answer based on the stock.
""";

            return aiService.askAI(prompt);

        } catch (Exception e) {
            e.printStackTrace();
            return "❌ Error: " + e.getMessage();
        }
    }
}
