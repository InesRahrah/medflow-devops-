package com.medflow.appointmentservice.controller;

import com.medflow.appointmentservice.entity.PreconQuestionTemplate;
import com.medflow.appointmentservice.repository.PreconQuestionTemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/question-templates")
public class PreconQuestionTemplateController {

    @Autowired
    private PreconQuestionTemplateRepository templateRepository;

    /**
     * Create a new question template defined by a doctor.
     * Returns the created template with HTTP 201.
     */
    @PostMapping
    public ResponseEntity<PreconQuestionTemplate> createTemplate(@RequestBody PreconQuestionTemplate template) {
        if (template == null) {
            return ResponseEntity.badRequest().build();
        }
        PreconQuestionTemplate created = templateRepository.save(template);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Get all question templates defined by a specific doctor.
     * Returns a list of templates with HTTP 200.
     */
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PreconQuestionTemplate>> getTemplatesByDoctor(@PathVariable Long doctorId) {
        List<PreconQuestionTemplate> templates = templateRepository.findByDoctorId(doctorId);
        return ResponseEntity.ok(templates);
    }

    /**
     * Get a specific question template by ID.
     * Returns HTTP 200 if found, HTTP 404 if not.
     */
    @GetMapping("/{templateId}")
    public ResponseEntity<PreconQuestionTemplate> getTemplateById(@PathVariable Long templateId) {
        if (templateId == null) {
            return ResponseEntity.badRequest().build();
        }
        Optional<PreconQuestionTemplate> template = templateRepository.findById(templateId);
        return template.map(ResponseEntity::ok)
                       .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update a question template.
     * Returns the updated template with HTTP 200, or HTTP 404 if not found.
     */
    @PutMapping("/{templateId}")
    public ResponseEntity<PreconQuestionTemplate> updateTemplate(@PathVariable Long templateId, @RequestBody PreconQuestionTemplate updatedTemplate) {
        Optional<PreconQuestionTemplate> existing = templateRepository.findById(templateId);
        if (existing.isPresent()) {
            PreconQuestionTemplate template = existing.get();
            if (updatedTemplate.getDoctorId() != null) {
                template.setDoctorId(updatedTemplate.getDoctorId());
            }
            if (updatedTemplate.getIsActive() != null) {
                template.setIsActive(updatedTemplate.getIsActive());
            }
            template.setUpdatedAt(java.time.LocalDateTime.now());
            templateRepository.save(template);
            return ResponseEntity.ok(template);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Delete a question template by ID.
     * Returns HTTP 204 if deleted, HTTP 404 if not found.
     */
    @DeleteMapping("/{templateId}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long templateId) {
        if (templateId == null) {
            return ResponseEntity.badRequest().build();
        }
        Optional<PreconQuestionTemplate> template = templateRepository.findById(templateId);
        if (template.isPresent()) {
            templateRepository.deleteById(templateId);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}