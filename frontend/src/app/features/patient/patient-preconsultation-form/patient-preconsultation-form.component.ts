import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AppointmentPreconsultationForm,
  PreconsultationAnswerSubmission,
  PreconsultationAnswerValue,
  PreconsultationQuestion,
  PreconsultationResponse,
  PreconsultationService,
} from '../../../core/services/preconsultation.service';

@Component({
  selector: 'app-patient-preconsultation-form',
  templateUrl: './patient-preconsultation-form.component.html',
  styleUrl: './patient-preconsultation-form.component.css',
})
export class PatientPreconsultationFormComponent implements OnInit {
  appointmentId = '';
  formDefinition: AppointmentPreconsultationForm | null = null;
  isLoading = true;
  isSubmitting = false;
  loadError = '';
  validationError = '';
  submittedResponse: PreconsultationResponse | null = null;

  readonly answers: Record<string, PreconsultationAnswerValue> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private preconsultationService: PreconsultationService,
  ) {}

  ngOnInit(): void {
    this.appointmentId = `${this.route.snapshot.paramMap.get('appointmentId') || ''}`;
    if (!this.appointmentId) {
      this.loadError = 'No appointment was provided for this preconsultation form.';
      this.isLoading = false;
      return;
    }

    this.loadForm();
  }

  trackQuestion(_: number, question: PreconsultationQuestion): number | string {
    return question.id ?? question.order;
  }

  questionKey(question: PreconsultationQuestion): string {
    return `${question.id ?? question.order}`;
  }

  getAnswer(question: PreconsultationQuestion): PreconsultationAnswerValue {
    return this.answers[this.questionKey(question)] ?? null;
  }

  setAnswer(question: PreconsultationQuestion, value: PreconsultationAnswerValue): void {
    this.answers[this.questionKey(question)] = value;
  }

  get visibleQuestions(): PreconsultationQuestion[] {
    return (this.formDefinition?.questions || []).filter((question) => this.isQuestionVisible(question));
  }

  isQuestionVisible(question: PreconsultationQuestion): boolean {
    if (!question.conditionalParentId) {
      return true;
    }

    const parentValue = this.answers[`${question.conditionalParentId}`];
    if (Array.isArray(parentValue)) {
      return parentValue.includes(question.conditionalTriggerValue as string);
    }

    return this.normalizeValue(parentValue) === this.normalizeValue(question.conditionalTriggerValue);
  }

  isSelectedOption(question: PreconsultationQuestion, option: string): boolean {
    const currentValue = this.answers[`${question.id ?? question.order}`];
    return Array.isArray(currentValue) ? currentValue.includes(option) : false;
  }

  toggleMultiChoice(question: PreconsultationQuestion, option: string, checked: boolean): void {
    const key = `${question.id ?? question.order}`;
    const currentValue = this.answers[key];
    const values = Array.isArray(currentValue) ? [...currentValue] : [];

    if (checked && !values.includes(option)) {
      values.push(option);
    }

    if (!checked) {
      const optionIndex = values.indexOf(option);
      if (optionIndex >= 0) {
        values.splice(optionIndex, 1);
      }
    }

    this.answers[key] = values;
  }

  submit(): void {
    if (!this.formDefinition || this.formDefinition.skipped || this.formDefinition.alreadySubmitted) {
      return;
    }

    this.validationError = this.validate();
    if (this.validationError) {
      return;
    }

    const payload: PreconsultationAnswerSubmission[] = this.visibleQuestions.map((question) => ({
      questionId: question.id ?? question.order,
      answer: this.answers[`${question.id ?? question.order}`] ?? null,
    }));

    this.isSubmitting = true;
    this.preconsultationService.submitAppointmentResponse(this.appointmentId, payload).subscribe({
      next: (response) => {
        this.submittedResponse = response;
        this.isSubmitting = false;
      },
      error: (error) => {
        this.validationError =
          error?.error?.message ||
          error?.error?.error ||
          'Unable to submit your preconsultation answers.';
        this.isSubmitting = false;
      },
    });
  }

  goToAppointments(): void {
    this.router.navigate(['/patient/appointments']);
  }

  getScaleMarkers(question: PreconsultationQuestion): number[] {
    const min = Number(question.scaleMin ?? 0);
    const max = Number(question.scaleMax ?? 10);
    const values: number[] = [];
    for (let current = min; current <= max; current++) {
      values.push(current);
    }
    return values;
  }

  private loadForm(): void {
    this.preconsultationService.getAppointmentForm(this.appointmentId).subscribe({
      next: (formDefinition) => {
        this.formDefinition = formDefinition;
        this.isLoading = false;
      },
      error: (error) => {
        this.loadError =
          error?.status === 404
            ? 'This appointment does not currently need a preconsultation form.'
            : error?.error?.message || 'Unable to load the preconsultation form.';
        this.isLoading = false;
      },
    });
  }

  private validate(): string {
    for (const question of this.visibleQuestions) {
      if (!question.required) {
        continue;
      }

      const value = this.answers[`${question.id ?? question.order}`];
      const serializedValue = `${value ?? ''}`;
      if (question.type === 'multi_choice') {
        if (!Array.isArray(value) || value.length === 0) {
          return `Answer required: ${question.text}`;
        }
        continue;
      }

      if (value === null || value === undefined || serializedValue.trim() === '') {
        return `Answer required: ${question.text}`;
      }
    }

    return '';
  }

  private normalizeValue(value: PreconsultationAnswerValue | undefined): string {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return `${value ?? ''}`.trim().toLowerCase();
  }
}