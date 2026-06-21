package com.medflow.stockservice.service;

import net.sourceforge.tess4j.Tesseract;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Base64;

@Service
public class OcrService {

    public String extractText(String base64Image) {

        try {
            // 🔥 Remove base64 prefix
            if (base64Image.contains(",")) {
                base64Image = base64Image.split(",")[1];
            }

            byte[] imageBytes = Base64.getDecoder().decode(base64Image);

            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));

            // 🔥 Convert to grayscale
            BufferedImage gray = new BufferedImage(
                    image.getWidth(),
                    image.getHeight(),
                    BufferedImage.TYPE_BYTE_GRAY
            );

            Graphics g = gray.getGraphics();
            g.drawImage(image, 0, 0, null);
            g.dispose();

            // 🔥 Tesseract
            Tesseract tesseract = new Tesseract();
            tesseract.setDatapath("D:\\Tesseract\\tessdata"); // ⚠️ adapte
            tesseract.setLanguage("eng");
            tesseract.setPageSegMode(6);

            String text = tesseract.doOCR(gray);

            // 🔥 Clean text
            return text
                    .replaceAll("[^a-zA-Z0-9\\n ]", "")
                    .replaceAll("\\s+", " ")
                    .trim();

        } catch (Exception e) {
            e.printStackTrace();
            return "OCR Error";
        }
    }
}
