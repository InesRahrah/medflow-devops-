package com.medflow.stockservice.service;

import com.medflow.stockservice.entity.RequestItem;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendApprovalEmail(String to, List<RequestItem> items) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(to);
        message.setSubject("✅ Your Request Has Been Approved");

        String itemsText = items.stream()
                .map(item -> "- " + item.getProduct().getProductName()
                        + " (Quantity: " + item.getRequestedQuantity() + ")")
                .collect(Collectors.joining("\n"));

        message.setText(
                "Dear Pharmacist,\n\n" +
                        "We are pleased to inform you that your request has been APPROVED.\n\n" +
                        "📦 Requested Medications:\n" +
                        itemsText + "\n\n" +
                        "Our delivery team will process your request shortly.\n\n" +
                        "Thank you for using MedFlow.\n\n" +
                        "Best regards,\n" +
                        "MedFlow Team"
        );

        mailSender.send(message);
    }

    public void sendRejectionEmail(String to, List<RequestItem> items) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(to);
        message.setSubject("❌ Your Request Has Been Rejected");

        String itemsText = items.stream()
                .map(item -> "- " + item.getProduct().getProductName()
                        + " (Quantity: " + item.getRequestedQuantity() + ")")
                .collect(Collectors.joining("\n"));

        message.setText(
                "Dear Pharmacist,\n\n" +
                        "We regret to inform you that your request has been REJECTED.\n\n" +
                        "📦 Requested Medications:\n" +
                        itemsText + "\n\n" +
                        "For more details, please contact the administration.\n\n" +
                        "Thank you for your understanding.\n\n" +
                        "Best regards,\n" +
                        "MedFlow Team"
        );

        mailSender.send(message);
    }
}
