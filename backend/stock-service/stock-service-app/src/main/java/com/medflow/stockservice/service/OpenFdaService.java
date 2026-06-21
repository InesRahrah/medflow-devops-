package com.medflow.stockservice.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class OpenFdaService {

    private final RestTemplate restTemplate = new RestTemplate();

    public String getDrugInfo(String drugName) {

        try {
            String url = "https://api.fda.gov/drug/label.json?search=openfda.brand_name:"
                    + drugName + "&limit=1";

            Map response = restTemplate.getForObject(url, Map.class);

            if (response == null || !response.containsKey("results")) {
                return "No info found for " + drugName;
            }

            List<Map> results = (List<Map>) response.get("results");

            if (results.isEmpty()) {
                return "No data available";
            }

            Map drug = results.get(0);

            return "Drug: " + drugName +
                    "\nPurpose: " + getField(drug, "purpose") +
                    "\nUsage: " + getField(drug, "indications_and_usage") +
                    "\nWarnings: " + getField(drug, "warnings");

        } catch (Exception e) {
            return "Error fetching drug info";
        }
    }

    private String getField(Map drug, String key) {
        try {
            List<String> list = (List<String>) drug.get(key);
            return (list != null && !list.isEmpty()) ? list.get(0) : "Not available";
        } catch (Exception e) {
            return "Not available";
        }
    }
}
///hihihih
