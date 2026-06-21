package com.medflow.appointmentservice.service;

import com.medflow.appointmentservice.entity.Appointment;
import com.medflow.appointmentservice.entity.PreconQuestion;
import com.medflow.appointmentservice.entity.PreconQuestionTemplate;
import com.medflow.appointmentservice.entity.Preconsultation;
import com.medflow.appointmentservice.entity.PreconsultationAnswer;
import com.medflow.appointmentservice.repository.AppointmentRepository;
import com.medflow.appointmentservice.repository.PreconQuestionRepository;
import com.medflow.appointmentservice.repository.PreconQuestionTemplateRepository;
import com.medflow.appointmentservice.repository.PreconsultationAnswerRepository;
import com.medflow.appointmentservice.repository.PreconsultationRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PreconsultationFlowService {

    public record TemplateQuestionPayload(
            Long id,
            Integer orderIndex,
            String text,
            String type,
            Boolean required,
            List<String> options,
            Integer scaleMin,
            Integer scaleMax,
            Boolean isRedFlag,
            String redFlagValue,
            Long conditionalParentId,
            String conditionalTriggerValue
    ) {}

    public record TemplatePayload(
            Long templateId,
            Long doctorId,
            Integer version,
            Boolean isActive,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<TemplateQuestionPayload> questions
    ) {}

    public record AnswerInput(Long questionId, String value) {}

    public record SubmitPayload(Long templateId, Long patientId, Long doctorId, LocalDateTime submittedAt, List<AnswerInput> answers) {}

    public record AnswerPayload(Long answerId, Long questionId, String questionText, String questionType, String value, Boolean isRedFlag) {}

    public record ResponsePayload(
            Long responseId,
            Long templateId,
            Long appointmentId,
            Long patientId,
            Long doctorId,
            LocalDateTime submittedAt,
            String riskLevel,
            List<AnswerPayload> answers
    ) {}

    private final PreconQuestionTemplateRepository templateRepository;
    private final PreconQuestionRepository questionRepository;
    private final PreconsultationRepository responseRepository;
    private final PreconsultationAnswerRepository answerRepository;
    private final AppointmentRepository appointmentRepository;

    public PreconsultationFlowService(PreconQuestionTemplateRepository templateRepository,
                                      PreconQuestionRepository questionRepository,
                                      PreconsultationRepository responseRepository,
                                      PreconsultationAnswerRepository answerRepository,
                                      AppointmentRepository appointmentRepository) {
        this.templateRepository = templateRepository;
        this.questionRepository = questionRepository;
        this.responseRepository = responseRepository;
        this.answerRepository = answerRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public Optional<TemplatePayload> getDoctorTemplate(Long doctorId) {
        return templateRepository
                .findFirstByDoctorIdAndIsActiveTrueOrderByVersionDescIdDesc(doctorId)
                .map(this::toTemplatePayload);
    }

    @Transactional
    public TemplatePayload createDoctorTemplate(Long doctorId, TemplatePayload request) {
        if (templateRepository.findFirstByDoctorIdAndIsActiveTrueOrderByVersionDescIdDesc(doctorId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An active preconsultation template already exists for this doctor");
        }

        PreconQuestionTemplate template = new PreconQuestionTemplate();
        template.setDoctorId(doctorId);
        template.setIsActive(request.isActive() == null ? true : request.isActive());
        template.setVersion(1);
        template.setCreatedAt(LocalDateTime.now());
        template.setUpdatedAt(LocalDateTime.now());

        PreconQuestionTemplate savedTemplate = templateRepository.save(template);
        List<PreconQuestion> questions = buildQuestions(savedTemplate, request.questions());
        questionRepository.saveAll(questions);

        return toTemplatePayload(savedTemplate);
    }

    @Transactional
    public TemplatePayload updateDoctorTemplate(Long doctorId, TemplatePayload request) {
        Optional<PreconQuestionTemplate> currentActive = templateRepository
            .findFirstByDoctorIdAndIsActiveTrueOrderByVersionDescIdDesc(doctorId);

        currentActive.ifPresent(active -> {
            active.setIsActive(false);
            active.setUpdatedAt(LocalDateTime.now());
            templateRepository.save(active);
        });

        int baseVersion = currentActive
            .map(PreconQuestionTemplate::getVersion)
            .orElseGet(() -> templateRepository.findByDoctorId(doctorId).stream()
                .map(PreconQuestionTemplate::getVersion)
                .filter(v -> v != null)
                .max(Integer::compareTo)
                .orElse(0));

        PreconQuestionTemplate nextVersion = new PreconQuestionTemplate();
        nextVersion.setDoctorId(doctorId);
        nextVersion.setIsActive(request.isActive() == null ? true : request.isActive());
        nextVersion.setVersion(baseVersion + 1);
        nextVersion.setCreatedAt(LocalDateTime.now());
        nextVersion.setUpdatedAt(LocalDateTime.now());

        PreconQuestionTemplate savedTemplate = templateRepository.save(nextVersion);
        List<PreconQuestion> questions = buildQuestions(savedTemplate, request.questions());
        questionRepository.saveAll(questions);

        return toTemplatePayload(savedTemplate);
    }

    @Transactional(readOnly = true)
    public TemplatePayload getAppointmentForm(Long appointmentId, UUID currentPatientUserId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (currentPatientUserId == null || !currentPatientUserId.equals(appointment.getIdPatient())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patient cannot access this appointment preconsultation");
        }

        PreconQuestionTemplate template = resolveTemplate(appointment, null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No preconsultation template available"));

        return toTemplatePayload(template);
    }

    @Transactional
    public ResponsePayload submitAppointmentPreconsultation(Long appointmentId,
                                                            SubmitPayload payload,
                                                            UUID currentPatientUserId,
                                                            Long currentPatientNumericId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (currentPatientUserId == null || !currentPatientUserId.equals(appointment.getIdPatient())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patient cannot submit for this appointment");
        }

        if (responseRepository.findByAppointmentIdAp(appointmentId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Preconsultation response already exists for this appointment");
        }

        PreconQuestionTemplate template = resolveTemplate(appointment, payload.templateId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No preconsultation template available"));

        Preconsultation response = new Preconsultation();
        response.setTemplate(template);
        response.setAppointment(appointment);
        response.setPatientId(currentPatientNumericId != null ? currentPatientNumericId : payload.patientId());
        response.setDoctorId(template.getDoctorId() != null ? template.getDoctorId() : payload.doctorId());
        response.setSubmittedAt(payload.submittedAt() == null ? LocalDateTime.now() : payload.submittedAt());

        List<PreconsultationAnswer> answers = new ArrayList<>();
        Map<Long, PreconQuestion> questionMap = questionRepository.findByTemplateIdOrderByOrderIndexAsc(template.getId())
                .stream()
                .collect(Collectors.toMap(PreconQuestion::getId, q -> q));

        boolean hasRedFlags = false;
        if (payload.answers() != null) {
            for (AnswerInput input : payload.answers()) {
                if (input == null || input.questionId() == null) {
                    continue;
                }
                PreconQuestion question = questionMap.get(input.questionId());
                if (question == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question does not belong to template: " + input.questionId());
                }

                PreconsultationAnswer answer = new PreconsultationAnswer();
                answer.setQuestion(question);
                answer.setValue(input.value());

                boolean redFlag = Boolean.TRUE.equals(question.getIsRedFlag())
                        && question.getRedFlagValue() != null
                        && input.value() != null
                        && question.getRedFlagValue().equalsIgnoreCase(input.value().trim());
                answer.setIsRedFlag(redFlag);
                hasRedFlags = hasRedFlags || redFlag;
                answers.add(answer);
            }
        }

        // Backend owns risk calculation so frontend can treat it as display-only.
        response.setRiskLevel(hasRedFlags ? Preconsultation.RiskLevel.urgent : Preconsultation.RiskLevel.routine);

        Preconsultation savedResponse;
        try {
            savedResponse = responseRepository.save(response);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Preconsultation response already exists for this appointment");
        }

        for (PreconsultationAnswer answer : answers) {
            answer.setResponse(savedResponse);
        }
        List<PreconsultationAnswer> savedAnswers = answerRepository.saveAll(answers);
        savedResponse.setAnswers(savedAnswers);

        return toResponsePayload(savedResponse, savedAnswers);
    }

    @Transactional(readOnly = true)
    public ResponsePayload getAppointmentResponse(Long appointmentId, UUID currentDoctorUserId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (currentDoctorUserId == null || !currentDoctorUserId.equals(appointment.getIdDoctor())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doctor cannot access this appointment response");
        }

        Optional<Preconsultation> responseOpt = responseRepository.findByAppointmentIdAp(appointmentId);

        if (responseOpt.isPresent()) {
            Preconsultation response = responseOpt.get();
            List<PreconsultationAnswer> answers = answerRepository.findByResponseId(response.getId());
            return toResponsePayload(response, answers);
        }

        // Fallback: if no preconsultation form was submitted but an AI summary exists
        // (e.g. appointment booked via chatbot), return it as a synthetic response
        if (appointment.getAiSummary() != null && !appointment.getAiSummary().isBlank()) {
            List<AnswerPayload> syntheticAnswers = List.of(
                    new AnswerPayload(null, null, "AI-Generated Intake Summary", "TEXT", appointment.getAiSummary(), false)
            );
            return new ResponsePayload(
                    null,
                    null,
                    appointmentId,
                    null,
                    null,
                    appointment.getCreatedAt(),
                    appointment.getTriageLevel() != null && appointment.getTriageLevel() <= 2 ? "urgent"
                            : appointment.getTriageLevel() != null && appointment.getTriageLevel() <= 3 ? "priority" : "routine",
                    syntheticAnswers
            );
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Preconsultation response not found");
    }

    private Optional<PreconQuestionTemplate> resolveTemplate(Appointment appointment, Long explicitTemplateId) {
        if (explicitTemplateId != null) {
            return templateRepository.findById(explicitTemplateId);
        }

        if (appointment.getPreconsultation() != null && appointment.getPreconsultation().getTemplate() != null) {
            return Optional.of(appointment.getPreconsultation().getTemplate());
        }

        // Fall back to the doctor's currently active template using the same UUID→Long
        // stable hash that is used when storing templates (matches controller logic).
        if (appointment.getIdDoctor() != null) {
            UUID doctorUuid = appointment.getIdDoctor();
            long mixed = doctorUuid.getMostSignificantBits() ^ doctorUuid.getLeastSignificantBits();
            long doctorNumericId = (mixed == Long.MIN_VALUE) ? 0L : Math.abs(mixed);
            Optional<PreconQuestionTemplate> byDoctor =
                    templateRepository.findFirstByDoctorIdAndIsActiveTrueOrderByVersionDescIdDesc(doctorNumericId);
            if (byDoctor.isPresent()) {
                return byDoctor;
            }
        }

        return Optional.empty();
    }

    private List<PreconQuestion> buildQuestions(PreconQuestionTemplate template, List<TemplateQuestionPayload> questionPayloads) {
        List<PreconQuestion> questions = new ArrayList<>();
        if (questionPayloads == null) {
            return questions;
        }

        int index = 0;
        for (TemplateQuestionPayload payload : questionPayloads) {
            if (payload == null) {
                continue;
            }
            PreconQuestion question = new PreconQuestion();
            question.setTemplate(template);
            question.setOrderIndex(payload.orderIndex() == null ? index : payload.orderIndex());
            question.setText(payload.text());
            question.setRequired(payload.required() == null ? true : payload.required());
            question.setOptions(payload.options());
            question.setScaleMin(payload.scaleMin());
            question.setScaleMax(payload.scaleMax());
            question.setIsRedFlag(payload.isRedFlag() == null ? false : payload.isRedFlag());
            question.setRedFlagValue(payload.redFlagValue());
            question.setConditionalTriggerValue(payload.conditionalTriggerValue());

            if (payload.type() != null) {
                try {
                    String normalizedType = payload.type()
                            .trim()
                            .toLowerCase()
                            .replace('-', '_')
                            .replace(' ', '_');
                    question.setType(PreconQuestion.QuestionType.valueOf(normalizedType));
                } catch (IllegalArgumentException ignored) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Invalid question type: " + payload.type());
                }
            }

            questions.add(question);
            index++;
        }

        return questions;
    }

    private TemplatePayload toTemplatePayload(PreconQuestionTemplate template) {
        List<TemplateQuestionPayload> questions = questionRepository.findByTemplateIdOrderByOrderIndexAsc(template.getId())
                .stream()
                .map(q -> new TemplateQuestionPayload(
                        q.getId(),
                        q.getOrderIndex(),
                        q.getText(),
                        q.getType() == null ? null : q.getType().name(),
                        q.getRequired(),
                        q.getOptions(),
                        q.getScaleMin(),
                        q.getScaleMax(),
                        q.getIsRedFlag(),
                        q.getRedFlagValue(),
                        q.getConditionalParent() == null ? null : q.getConditionalParent().getId(),
                        q.getConditionalTriggerValue()
                ))
                .toList();

        return new TemplatePayload(
                template.getId(),
                template.getDoctorId(),
                template.getVersion(),
                template.getIsActive(),
                template.getCreatedAt(),
                template.getUpdatedAt(),
                questions
        );
    }

    private ResponsePayload toResponsePayload(Preconsultation response, List<PreconsultationAnswer> answers) {
        List<AnswerPayload> answerPayloads = answers == null ? List.of() : answers.stream()
                .map(a -> new AnswerPayload(
                        a.getId(),
                        a.getQuestion() == null ? null : a.getQuestion().getId(),
                        a.getQuestion() == null ? null : a.getQuestion().getText(),
                        a.getQuestion() == null ? null : (a.getQuestion().getType() == null ? null : a.getQuestion().getType().name()),
                        a.getValue(),
                        a.getIsRedFlag()
                ))
                .toList();

        return new ResponsePayload(
                response.getId(),
                response.getTemplate() == null ? null : response.getTemplate().getId(),
                response.getAppointment() == null ? null : response.getAppointment().getIdAp(),
                response.getPatientId(),
                response.getDoctorId(),
                response.getSubmittedAt(),
                response.getRiskLevel() == null ? null : response.getRiskLevel().name(),
                answerPayloads
        );
    }
}
