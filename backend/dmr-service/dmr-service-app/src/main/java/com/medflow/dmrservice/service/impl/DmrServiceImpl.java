package com.medflow.dmrservice.service.impl;

import com.medflow.dmrservice.client.UserServiceClient;
import com.medflow.dmrservice.dto.*;
import com.medflow.dmrservice.entity.*;
import com.medflow.dmrservice.exception.ResourceNotFoundException;
import com.medflow.dmrservice.repository.*;
import com.medflow.dmrservice.service.DmrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DmrServiceImpl implements DmrService {

    private static final LocalTime MORNING_TIME = LocalTime.of(8, 0);
    private static final LocalTime AFTERNOON_TIME = LocalTime.of(14, 0);
    private static final LocalTime NIGHT_TIME = LocalTime.of(20, 0);

    private final UserServiceClient userServiceClient;
    private final MedicalCaseRepository medicalCaseRepository;
    private final CaseMemberRepository caseMemberRepository;
    private final ConsultationRepository consultationRepository;
    private final LabRequestRepository labRequestRepository;
    private final LabResultRepository labResultRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final DosageRepository dosageRepository;
    private final MedicineRepository medicineRepository;

    @Override
    @Transactional
    public UUID createMedicine(CreateMedicineRequest request) {
        Medicine medicine = Medicine.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();
        return medicineRepository.save(medicine).getId();
    }

        @Override
        @Transactional(readOnly = true)
        public List<MedicineResponse> getMedicines() {
        return medicineRepository.findAllByOrderByNameAsc().stream()
            .map(medicine -> MedicineResponse.builder()
                .id(medicine.getId())
                .name(medicine.getName())
                .description(medicine.getDescription())
                .build())
            .toList();
        }

        @Override
        @Transactional(readOnly = true)
        public ValidateAccessCodeResponse validateAccessCode(ValidateAccessCodeRequest request) {
            UUID patientId = validateAndGetPatientIdFromAccessCode(request.getAccessCode());
            return ValidateAccessCodeResponse.builder()
                    .valid(true)
                    .patientId(patientId)
                    .build();
        }

    @Override
    @Transactional
    public MedicalCaseResponse createMedicalCase(CreateMedicalCaseRequest request) {
        if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must be after startDate");
        }

            UUID patientId = validateAndGetPatientIdFromAccessCode(request.getAccessCode());

        MedicalCase newMedicalCase = MedicalCase.builder()
                    .patientId(patientId)
                .doctorId(request.getDoctorId())
                .name(request.getName())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();
        MedicalCase medicalCase = medicalCaseRepository.save(newMedicalCase);

        Set<UUID> memberIds = new LinkedHashSet<>();
        memberIds.add(request.getDoctorId());
        memberIds.add(patientId);
        if (request.getMemberIds() != null) {
            memberIds.addAll(request.getMemberIds());
        }

        List<CaseMember> members = memberIds.stream()
                .map(memberId -> CaseMember.builder()
                        .medicalCase(medicalCase)
                        .memberId(memberId)
                        .build())
                .toList();
        caseMemberRepository.saveAll(members);

        return MedicalCaseResponse.builder()
                .id(medicalCase.getId())
                .patientId(medicalCase.getPatientId())
                .doctorId(medicalCase.getDoctorId())
                .name(medicalCase.getName())
                .startDate(medicalCase.getStartDate())
                .endDate(medicalCase.getEndDate())
                .createdAt(medicalCase.getCreatedAt())
                .members(memberIds)
                .build();
    }

    @Override
    @Transactional
    public MedicalCaseResponse joinMedicalCase(UUID medicalCaseId, JoinMedicalCaseRequest request) {
        MedicalCase medicalCase = getMedicalCase(medicalCaseId);
        UUID patientId = validateAndGetPatientIdFromAccessCode(request.getAccessCode());

        if (!medicalCase.getPatientId().equals(patientId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Access code does not match the patient for this case");
        }

        createCaseMemberIfMissing(medicalCase, request.getDoctorId());
        createCaseMemberIfMissing(medicalCase, patientId);

        return toMedicalCaseResponse(medicalCase);
    }

    @Override
    @Transactional
    public MedicalCaseResponse updateMedicalCase(UUID medicalCaseId, UpdateMedicalCaseRequest request) {
        if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must be after startDate");
        }

        ensureDoctorCaseMembership(medicalCaseId, request.getDoctorId());
        MedicalCase medicalCase = getMedicalCase(medicalCaseId);
        medicalCase.setName(request.getName());
        medicalCase.setStartDate(request.getStartDate());
        medicalCase.setEndDate(request.getEndDate());
        return toMedicalCaseResponse(medicalCaseRepository.save(medicalCase));
    }

    @Override
    @Transactional
    public void deleteMedicalCase(UUID medicalCaseId, UUID doctorId) {
        ensureDoctorCaseMembership(medicalCaseId, doctorId);
        MedicalCase medicalCase = getMedicalCase(medicalCaseId);

        List<Prescription> prescriptions = prescriptionRepository.findByMedicalCaseId(medicalCaseId);
        for (Prescription prescription : prescriptions) {
            dosageRepository.deleteByPrescriptionId(prescription.getId());
        }

        consultationRepository.deleteByMedicalCaseId(medicalCaseId);
        labResultRepository.deleteByMedicalCaseId(medicalCaseId);
        labRequestRepository.deleteByMedicalCaseId(medicalCaseId);
        prescriptionRepository.deleteByMedicalCaseId(medicalCaseId);
        caseMemberRepository.deleteByMedicalCaseId(medicalCaseId);
        medicalCaseRepository.delete(medicalCase);
    }

            @Override
            @Transactional(readOnly = true)
            public List<MedicalCaseResponse> getMedicalCasesByPatient(UUID patientId) {
            return medicalCaseRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toMedicalCaseResponse)
                .toList();
            }

            @Override
            @Transactional(readOnly = true)
            public List<MedicalCaseResponse> getMedicalCasesByDoctor(UUID doctorId) {
            return caseMemberRepository.findByMemberId(doctorId).stream()
                .map(CaseMember::getMedicalCase)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(MedicalCase::getCreatedAt, Comparator.nullsLast(LocalDateTime::compareTo)).reversed())
                .map(this::toMedicalCaseResponse)
                .toList();
            }

            @Override
            @Transactional(readOnly = true)
            public MedicalCaseDetailsResponse getMedicalCaseDetails(UUID medicalCaseId) {
            MedicalCase medicalCase = getMedicalCase(medicalCaseId);
            List<MedicalCaseDetailItemResponse> details = new ArrayList<>();

            consultationRepository.findByMedicalCaseIdOrderByConsultationDateAsc(medicalCaseId).forEach(consultation ->
                details.add(MedicalCaseDetailItemResponse.builder()
                    .id(consultation.getId())
                    .doctorId(consultation.getDoctorId())
                    .type("consultation")
                    .name("Consultation")
                    .involvedPersonnel("Doctor " + consultation.getDoctorId())
                    .additionalInfo(consultation.getNotes())
                    .date(consultation.getConsultationDate())
                    .build())
            );

            labRequestRepository.findByMedicalCaseIdOrderByCreatedAtAsc(medicalCaseId).forEach(request ->
                details.add(MedicalCaseDetailItemResponse.builder()
                    .id(request.getId())
                    .doctorId(resolveLabRequestDoctorId(request))
                    .laboId(request.getLaboId())
                    .type("lab_request")
                    .status(request.getStatus() != null ? request.getStatus().name() : LabRequestStatus.CREATED.name())
                    .name(request.getTestType())
                    .involvedPersonnel(request.getLaboId() != null ? "Laboratory " + request.getLaboId() : "Awaiting laboratory assignment")
                    .additionalInfo(request.getNotes())
                    .date(request.getCreatedAt())
                    .build())
            );

            labResultRepository.findByMedicalCaseIdOrderByResultDateAsc(medicalCaseId).forEach(result ->
                details.add(MedicalCaseDetailItemResponse.builder()
                    .id(result.getId())
                    .doctorId(result.getLaboId())
                    .laboId(result.getLaboId())
                    .labRequestId(result.getLabRequest().getId())
                    .type("lab_results")
                    .status(LabRequestStatus.COMPLETED.name())
                    .name("Lab Result")
                    .involvedPersonnel("Laboratory " + result.getLaboId())
                    .additionalInfo(result.getResultText())
                    .fileUrl(result.getResultFileUrl())
                    .date(result.getResultDate())
                    .build())
            );

            prescriptionRepository.findByMedicalCaseIdOrderByCreatedAtAsc(medicalCaseId).forEach(prescription ->
                details.add(MedicalCaseDetailItemResponse.builder()
                    .id(prescription.getId())
                    .doctorId(prescription.getDoctorId())
                    .type("treatment")
                    .name("Prescription")
                    .involvedPersonnel("Doctor " + prescription.getDoctorId())
                    .additionalInfo(prescription.getNotes())
                    .date(prescription.getCreatedAt())
                    .build())
            );

            details.sort(Comparator.comparing(MedicalCaseDetailItemResponse::getDate, Comparator.nullsLast(LocalDateTime::compareTo)));

            return MedicalCaseDetailsResponse.builder()
                .medicalCaseId(medicalCaseId)
                .caseName(medicalCase.getName())
                .details(details)
                .build();
            }

    @Override
    @Transactional
    public UUID createConsultation(UUID medicalCaseId, CreateConsultationRequest request) {
        MedicalCase medicalCase = getMedicalCase(medicalCaseId);
        Consultation consultation = Consultation.builder()
                .medicalCase(medicalCase)
                .doctorId(request.getDoctorId())
                .consultationDate(request.getConsultationDate())
                .notes(request.getNotes())
                .build();
        return consultationRepository.save(consultation).getId();
    }

    @Override
    @Transactional
    public UUID updateConsultation(UUID consultationId, UpdateConsultationRequest request) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found: " + consultationId));

        ensureDoctorOwnership(consultation.getDoctorId(), request.getDoctorId());
        consultation.setConsultationDate(request.getConsultationDate());
        consultation.setNotes(request.getNotes());
        return consultationRepository.save(consultation).getId();
    }

    @Override
    @Transactional
    public void deleteConsultation(UUID consultationId, UUID doctorId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found: " + consultationId));

        ensureDoctorOwnership(consultation.getDoctorId(), doctorId);
        consultationRepository.delete(consultation);
    }

    @Override
    @Transactional
    public UUID createLabRequest(UUID medicalCaseId, CreateLabRequestRequest request) {
        MedicalCase medicalCase = getMedicalCase(medicalCaseId);
        ensureDoctorCaseMembership(medicalCaseId, request.getDoctorId());

        LabRequest labRequest = LabRequest.builder()
                .medicalCase(medicalCase)
            .doctorId(request.getDoctorId())
                .status(LabRequestStatus.CREATED)
                .testType(request.getTestType())
                .notes(request.getNotes())
                .build();
        return labRequestRepository.save(labRequest).getId();
    }

    @Override
    @Transactional
    public UUID updateLabRequest(UUID labRequestId, UpdateLabRequestRequest request) {
        LabRequest labRequest = labRequestRepository.findById(labRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab request not found: " + labRequestId));

        ensureDoctorOwnership(resolveLabRequestDoctorId(labRequest), request.getDoctorId());

        if (labRequest.getStatus() == LabRequestStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completed lab requests cannot be edited");
        }

        labRequest.setTestType(request.getTestType());
        labRequest.setNotes(request.getNotes());
        return labRequestRepository.save(labRequest).getId();
    }

    @Override
    @Transactional
    public UUID assignLabToRequest(UUID labRequestId, AssignLabRequestRequest request) {
        LabRequest labRequest = labRequestRepository.findById(labRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab request not found: " + labRequestId));

        UUID expectedPatientId = labRequest.getMedicalCase().getPatientId();
        if (!expectedPatientId.equals(request.getPatientId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only the patient linked to this case can assign the laboratory");
        }

        if (labRequest.getStatus() == LabRequestStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This lab request is already completed");
        }

        UserProfileLookupResponse selectedLab = userServiceClient.getInternalLaboratoryById(request.getLaboId());
        if (!supportsTestType(selectedLab.getSupportedTests(), labRequest.getTestType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected laboratory does not support this requested service type");
        }

        labRequest.setLaboId(request.getLaboId());
        labRequest.setStatus(LabRequestStatus.PENDING);
        return labRequestRepository.save(labRequest).getId();
    }

    @Override
    @Transactional
    public void deleteLabRequest(UUID labRequestId, UUID doctorId) {
        LabRequest labRequest = labRequestRepository.findById(labRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab request not found: " + labRequestId));

        ensureDoctorOwnership(resolveLabRequestDoctorId(labRequest), doctorId);
        labRequestRepository.delete(labRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabQueueItemResponse> getLabReports(UUID laboId) {
        return labRequestRepository.findByLaboIdOrderByCreatedAtDesc(laboId)
                .stream()
                .map(this::toLabQueueItem)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabQueueItemResponse> getPendingLabRequests(UUID laboId) {
        return labRequestRepository.findByLaboIdAndStatusOrderByCreatedAtDesc(laboId, LabRequestStatus.PENDING)
                .stream()
                .map(this::toLabQueueItem)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LabQueueItemResponse getLabRequestSummary(UUID labRequestId) {
        LabRequest request = labRequestRepository.findById(labRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Lab request not found: " + labRequestId));
        return toLabQueueItem(request);
    }

    @Override
    @Transactional
    public UUID createLabResult(UUID medicalCaseId, CreateLabResultRequest request) {
        MedicalCase medicalCase = getMedicalCase(medicalCaseId);
        LabRequest labRequest = labRequestRepository.findById(request.getLabRequestId())
                .orElseThrow(() -> new ResourceNotFoundException("Lab request not found: " + request.getLabRequestId()));

        if (!labRequest.getMedicalCase().getId().equals(medicalCaseId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "labRequestId does not belong to this medical case");
        }

        if (labRequest.getLaboId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lab request is not assigned to any laboratory yet");
        }

        if (!labRequest.getLaboId().equals(request.getLaboId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This laboratory is not assigned to the selected lab request");
        }

        if (labRequest.getStatus() == LabRequestStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lab request is already completed");
        }

        LabResult result = LabResult.builder()
                .medicalCase(medicalCase)
                .labRequest(labRequest)
                .laboId(request.getLaboId())
                .resultText(request.getResultText())
                .resultFileUrl(request.getResultFileUrl())
                .resultDate(request.getResultDate())
                .build();

        LabResult saved = labResultRepository.save(result);
        labRequest.setStatus(LabRequestStatus.COMPLETED);
        labRequestRepository.save(labRequest);
        return saved.getId();
    }

    @Override
    @Transactional
    public UUID createPrescription(UUID medicalCaseId, CreatePrescriptionRequest request) {
        MedicalCase medicalCase = getMedicalCase(medicalCaseId);
        if (request.getDosePlans() == null || request.getDosePlans().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dosePlans is required");
        }

        Prescription prescription = Prescription.builder()
                .medicalCase(medicalCase)
                .doctorId(request.getDoctorId())
                .notes(request.getNotes())
                .build();
        prescription = prescriptionRepository.save(prescription);

        for (PrescriptionDosePlanRequest plan : request.getDosePlans()) {
            if (plan.getMedicineId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each dose plan must provide medicineId");
            }

            Medicine medicine = medicineRepository.findById(plan.getMedicineId())
                    .orElseThrow(() -> new ResourceNotFoundException("Medicine not found: " + plan.getMedicineId()));

            int morning = Optional.ofNullable(plan.getMorning()).orElse(0);
            int afternoon = Optional.ofNullable(plan.getAfternoon()).orElse(0);
            int night = Optional.ofNullable(plan.getNight()).orElse(0);
            int days = Optional.ofNullable(plan.getDays()).orElse(0);

            if (days <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each dose plan must have days >= 1");
            }
            if (morning + afternoon + night <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each dose plan must include at least one period value > 0");
            }

            createDosages(prescription, medicine, morning, afternoon, night, days, plan.getDoseNotes());
        }

        return prescription.getId();
    }

    @Override
    @Transactional
    public UUID updatePrescription(UUID prescriptionId, UpdatePrescriptionRequest request) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + prescriptionId));

        ensureDoctorOwnership(prescription.getDoctorId(), request.getDoctorId());
        prescription.setNotes(request.getNotes());
        return prescriptionRepository.save(prescription).getId();
    }

    @Override
    @Transactional
    public void deletePrescription(UUID prescriptionId, UUID doctorId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + prescriptionId));

        ensureDoctorOwnership(prescription.getDoctorId(), doctorId);
        dosageRepository.deleteByPrescriptionId(prescriptionId);
        prescriptionRepository.delete(prescription);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DosageResponse> getPrescriptionDosages(UUID prescriptionId) {
        return dosageRepository.findByPrescriptionIdOrderByTimeAsc(prescriptionId).stream()
                .map(this::toDosageResponse)
                .toList();
    }

    @Override
    @Transactional
    public DosageResponse updateDosage(UUID dosageId, UpdateDosageRequest request) {
        Dosage dosage = dosageRepository.findById(dosageId)
                .orElseThrow(() -> new ResourceNotFoundException("Dosage not found: " + dosageId));

        ensureDoctorOwnership(dosage.getPrescription().getDoctorId(), request.getDoctorId());
        dosage.setQuantity(request.getQuantity());
        dosage.setDoseNotes(request.getDoseNotes());
        dosage.setTime(request.getTime());
        dosage.setTaken(Boolean.TRUE.equals(request.getTaken()));
        return toDosageResponse(dosageRepository.save(dosage));
    }

    @Override
    @Transactional
    public void deleteDosage(UUID dosageId, UUID doctorId) {
        Dosage dosage = dosageRepository.findById(dosageId)
                .orElseThrow(() -> new ResourceNotFoundException("Dosage not found: " + dosageId));

        ensureDoctorOwnership(dosage.getPrescription().getDoctorId(), doctorId);
        dosageRepository.delete(dosage);
    }

    @Override
    @Transactional
    public DosageResponse updateDosageTaken(UUID dosageId, UpdateDosageTakenRequest request) {
        Dosage dosage = dosageRepository.findById(dosageId)
                .orElseThrow(() -> new ResourceNotFoundException("Dosage not found: " + dosageId));
        dosage.setTaken(request.isTaken());
        return toDosageResponse(dosageRepository.save(dosage));
    }

    private void createDosages(Prescription prescription, Medicine medicine, int morningQuantity, int afternoonQuantity, int nightQuantity, int days, String doseNotes) {
        List<Dosage> dosages = new ArrayList<>();
        LocalDate startDate = LocalDate.now();

        for (int day = 0; day < days; day++) {
            LocalDate currentDate = startDate.plusDays(day);

            if (morningQuantity > 0) {
                dosages.add(newDosage(prescription, medicine, String.valueOf(morningQuantity), currentDate.atTime(MORNING_TIME), doseNotes));
            }
            if (afternoonQuantity > 0) {
                dosages.add(newDosage(prescription, medicine, String.valueOf(afternoonQuantity), currentDate.atTime(AFTERNOON_TIME), doseNotes));
            }
            if (nightQuantity > 0) {
                dosages.add(newDosage(prescription, medicine, String.valueOf(nightQuantity), currentDate.atTime(NIGHT_TIME), doseNotes));
            }
        }

        dosageRepository.saveAll(dosages);
    }

    private Dosage newDosage(Prescription prescription, Medicine medicine, String quantity, LocalDateTime time, String doseNotes) {
        return Dosage.builder()
                .prescription(prescription)
                .medicine(medicine)
                .quantity(quantity)
                .doseNotes(doseNotes)
                .time(time)
                .taken(false)
                .build();
    }

    private MedicalCase getMedicalCase(UUID medicalCaseId) {
        return medicalCaseRepository.findById(medicalCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Medical case not found: " + medicalCaseId));
    }

    private UUID validateAndGetPatientIdFromAccessCode(String accessCode) {
        UserServiceValidateAccessCodeResponse validation = userServiceClient.validateAccessCode(accessCode);
        if (validation == null || !validation.isValid() || validation.getPatientId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid patient code");
        }
        return validation.getPatientId();
    }

    private void createCaseMemberIfMissing(MedicalCase medicalCase, UUID memberId) {
        if (memberId == null) {
            return;
        }

        if (!caseMemberRepository.existsByMedicalCaseIdAndMemberId(medicalCase.getId(), memberId)) {
            CaseMember member = CaseMember.builder()
                    .medicalCase(medicalCase)
                    .memberId(memberId)
                    .build();
            caseMemberRepository.save(member);
        }
    }

    private DosageResponse toDosageResponse(Dosage dosage) {
        return DosageResponse.builder()
                .id(dosage.getId())
                .prescriptionId(dosage.getPrescription().getId())
                .medicineId(dosage.getMedicine().getId())
                .quantity(dosage.getQuantity())
            .doseNotes(dosage.getDoseNotes())
                .time(dosage.getTime())
                .taken(dosage.isTaken())
                .build();
    }

    private void ensureDoctorOwnership(UUID ownerDoctorId, UUID actorDoctorId) {
        if (actorDoctorId == null || !ownerDoctorId.equals(actorDoctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author doctor can modify this item");
        }
    }

    private void ensureDoctorCaseMembership(UUID medicalCaseId, UUID doctorId) {
        if (doctorId == null || !caseMemberRepository.existsByMedicalCaseIdAndMemberId(medicalCaseId, doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors in this case can modify it");
        }
    }

    private MedicalCaseResponse toMedicalCaseResponse(MedicalCase medicalCase) {
        Set<UUID> members = caseMemberRepository.findByMedicalCaseId(medicalCase.getId()).stream()
                .map(CaseMember::getMemberId)
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);

        return MedicalCaseResponse.builder()
                .id(medicalCase.getId())
                .patientId(medicalCase.getPatientId())
                .doctorId(medicalCase.getDoctorId())
                .name(medicalCase.getName())
                .startDate(medicalCase.getStartDate())
                .endDate(medicalCase.getEndDate())
                .createdAt(medicalCase.getCreatedAt())
                .members(members)
                .build();
    }

    private LabQueueItemResponse toLabQueueItem(LabRequest request) {
        MedicalCase medicalCase = request.getMedicalCase();
        UUID patientId = medicalCase.getPatientId();
        UUID requestedByDoctorId = resolveLabRequestDoctorId(request);

        UserProfileLookupResponse patientProfile = userServiceClient.getInternalUserById(patientId);
        UserProfileLookupResponse doctorProfile = userServiceClient.getInternalUserById(requestedByDoctorId);
        UserProfileLookupResponse laboratoryProfile = request.getLaboId() != null
                ? userServiceClient.getInternalLaboratoryById(request.getLaboId())
                : null;

        return LabQueueItemResponse.builder()
                .requestId(request.getId())
                .medicalCaseId(medicalCase.getId())
                .patientId(patientId)
                .patientName(formatDisplayName(patientProfile, "Patient"))
                .requestedByDoctorId(requestedByDoctorId)
                .requestedByName(formatDisplayName(doctorProfile, "Doctor"))
                .laboId(request.getLaboId())
                .laboName(formatDisplayName(laboratoryProfile, "Laboratory"))
                .testType(request.getTestType())
                .notes(request.getNotes())
                .status(request.getStatus() != null ? request.getStatus().name() : LabRequestStatus.CREATED.name())
                .requestedAt(request.getCreatedAt())
                .build();
    }

    private UUID resolveLabRequestDoctorId(LabRequest request) {
        if (request.getDoctorId() != null) {
            return request.getDoctorId();
        }

        return request.getMedicalCase().getDoctorId();
    }

    private String formatDisplayName(UserProfileLookupResponse profile, String fallback) {
        if (profile == null) {
            return fallback;
        }

        String firstName = profile.getFirstName() == null ? "" : profile.getFirstName().trim();
        String lastName = profile.getLastName() == null ? "" : profile.getLastName().trim();
        if (!firstName.isEmpty() || !lastName.isEmpty()) {
            return (firstName + " " + lastName).trim();
        }

        if (profile.getName() != null && !profile.getName().trim().isEmpty()) {
            return profile.getName().trim();
        }
        if (profile.getLabName() != null && !profile.getLabName().trim().isEmpty()) {
            return profile.getLabName().trim();
        }
        if (profile.getCompanyName() != null && !profile.getCompanyName().trim().isEmpty()) {
            return profile.getCompanyName().trim();
        }

        if (profile.getEmail() != null && profile.getEmail().contains("@")) {
            return profile.getEmail().split("@")[0];
        }

        return fallback;
    }

    private boolean supportsTestType(String supportedTests, String requestedTestType) {
        if (requestedTestType == null || requestedTestType.isBlank()) {
            return false;
        }
        if (supportedTests == null || supportedTests.isBlank()) {
            return false;
        }

        String requested = normalizeToken(requestedTestType);
        String[] tokens = supportedTests.split("[,;|\\n]");

        for (String token : tokens) {
            String normalizedToken = normalizeToken(token);
            if (normalizedToken.isEmpty()) {
                continue;
            }
            if (normalizedToken.equals(requested)
                    || normalizedToken.contains(requested)
                    || requested.contains(normalizedToken)) {
                return true;
            }
        }

        return false;
    }

    private String normalizeToken(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPatientPrescriptions(UUID patientId) {
        List<MedicalCaseResponse> cases = getMedicalCasesByPatient(patientId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (MedicalCaseResponse caseResponse : cases) {
            List<Prescription> prescriptions = prescriptionRepository.findByMedicalCaseId(caseResponse.getId());
            for (Prescription prescription : prescriptions) {
                Map<String, Object> prescriptionMap = new HashMap<>();
                prescriptionMap.put("id", prescription.getId());
                prescriptionMap.put("prescriptionDate", prescription.getCreatedAt());
                prescriptionMap.put("doctorId", prescription.getDoctorId());
                prescriptionMap.put("notes", prescription.getNotes());

                List<DosageResponse> dosages = dosageRepository.findByPrescriptionIdOrderByTimeAsc(prescription.getId())
                        .stream()
                        .map(this::toDosageResponse)
                        .toList();
                prescriptionMap.put("dosages", dosages);

                result.add(prescriptionMap);
            }
        }

        return result;
    }
}
