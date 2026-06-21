import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  PreconsultationQuestion,
  PreconsultationQuestionType,
  PreconsultationService,
} from '../../core/services/preconsultation.service';

type QuestionTypeOption = {
  value: PreconsultationQuestionType;
  label: string;
  description: string;
};

@Component({
  selector: 'app-doctor-preconsultation-setup',
  templateUrl: './doctor-preconsultation-setup.component.html',
  styleUrl: './doctor-preconsultation-setup.component.css',
})
export class DoctorPreconsultationSetupComponent implements OnInit {
  readonly questionTypes: QuestionTypeOption[] = [
    { value: 'text', label: 'Text', description: 'Open response for symptoms or concerns.' },
    { value: 'yes_no', label: 'Yes / No', description: 'Simple binary question for screening.' },
    { value: 'single_choice', label: 'Single choice', description: 'Patient picks one option.' },
    { value: 'multi_choice', label: 'Multi choice', description: 'Patient can select multiple options.' },
    { value: 'scale', label: 'Scale', description: 'Severity or frequency scoring.' },
    { value: 'number', label: 'Number', description: 'Numeric input like temperature or duration.' },
  ];

  questions: PreconsultationQuestion[] = [];
  isLoading = true;
  isSaving = false;
  hasExistingTemplate = false;
  saveError = '';
  saveSuccess = '';

  constructor(
    private preconsultationService: PreconsultationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadTemplate();
  }

  trackQuestion(_: number, question: PreconsultationQuestion): number | string {
    return question.id ?? question.order;
  }

  addQuestion(type: PreconsultationQuestionType = 'text'): void {
    const nextOrder = this.questions.length + 1;
    const question = this.buildQuestion(type, nextOrder);
    this.questions = [...this.questions, question];
  }

  removeQuestion(index: number): void {
    this.questions = this.questions
      .filter((_, questionIndex) => questionIndex !== index)
      .map((question, questionIndex) => ({
        ...question,
        order: questionIndex + 1,
      }));
  }

  moveQuestion(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.questions.length) {
      return;
    }

    const reordered = [...this.questions];
    const [current] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, current);
    this.questions = reordered.map((question, questionIndex) => ({
      ...question,
      order: questionIndex + 1,
    }));
  }

  onTypeChange(question: PreconsultationQuestion): void {
    if (!this.usesOptions(question.type)) {
      question.options = [];
    } else if (!question.options || question.options.length === 0) {
      question.options = ['Option 1', 'Option 2'];
    }

    if (question.type !== 'scale') {
      question.scaleMin = null;
      question.scaleMax = null;
    } else {
      question.scaleMin = Number(question.scaleMin ?? 0);
      question.scaleMax = Number(question.scaleMax ?? 10);
    }

    if (question.type === 'text') {
      question.isRedFlag = false;
      question.redFlagValue = null;
    }
  }

  addOption(question: PreconsultationQuestion): void {
    question.options = [...(question.options || []), `Option ${(question.options || []).length + 1}`];
  }

  removeOption(question: PreconsultationQuestion, optionIndex: number): void {
    question.options = (question.options || []).filter((_, index) => index !== optionIndex);
  }

  getConditionalParents(index: number): PreconsultationQuestion[] {
    return this.questions.slice(0, index).filter((question) => this.supportsConditionalTarget(question.type));
  }

  onConditionalParentChange(question: PreconsultationQuestion): void {
    if (!question.conditionalParentId) {
      question.conditionalTriggerValue = null;
      return;
    }

    const parent = this.questions.find((candidate) => String(candidate.id ?? candidate.order) === String(question.conditionalParentId));
    if (!parent) {
      question.conditionalParentId = null;
      question.conditionalTriggerValue = null;
      return;
    }

    if (parent.type === 'yes_no' && question.conditionalTriggerValue == null) {
      question.conditionalTriggerValue = true;
    }

    if (this.usesOptions(parent.type) && question.conditionalTriggerValue == null) {
      question.conditionalTriggerValue = parent.options?.[0] ?? null;
    }
  }

  saveTemplate(): void {
    this.saveError = '';
    this.saveSuccess = '';

    const validationError = this.validateQuestions();
    if (validationError) {
      this.saveError = validationError;
      return;
    }

    this.isSaving = true;

    this.preconsultationService
      .saveMyTemplate(this.prepareQuestionsForSave(), this.hasExistingTemplate)
      .subscribe({
        next: (template) => {
          this.hasExistingTemplate = true;
          this.questions = template.questions.length > 0 ? template.questions : this.prepareQuestionsForSave();
          this.saveSuccess = 'Preconsultation questions saved successfully.';
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Preconsultation template save failed:', error?.error || error);
          this.saveError =
            error?.error?.message ||
            error?.error?.details ||
            error?.error?.error ||
            (typeof error?.error === 'string' ? error.error : '') ||
            error?.error?.error ||
            'Unable to save preconsultation questions right now.';
          this.isSaving = false;
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/doctor']);
  }

  getRedFlagOptions(question: PreconsultationQuestion): Array<{ label: string; value: string | boolean | number }> {
    if (question.type === 'yes_no') {
      return [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ];
    }

    if (this.usesOptions(question.type)) {
      return (question.options || []).map((option) => ({ label: option, value: option }));
    }

    if (question.type === 'scale') {
      const min = Number(question.scaleMin ?? 0);
      const max = Number(question.scaleMax ?? 10);
      const values: Array<{ label: string; value: number }> = [];
      for (let current = min; current <= max; current++) {
        values.push({ label: String(current), value: current });
      }
      return values;
    }

    return [];
  }

  getConditionalValues(question: PreconsultationQuestion): Array<{ label: string; value: string | boolean | number }> {
    const parent = this.questions.find((candidate) => String(candidate.id ?? candidate.order) === String(question.conditionalParentId));
    if (!parent) {
      return [];
    }

    if (parent.type === 'yes_no') {
      return [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ];
    }

    if (this.usesOptions(parent.type)) {
      return (parent.options || []).map((option) => ({ label: option, value: option }));
    }

    return [];
  }

  private loadTemplate(): void {
    this.preconsultationService.getMyTemplate().subscribe({
      next: (template) => {
        this.hasExistingTemplate = !!template;
        this.questions = template?.questions?.length
          ? template.questions
          : this.buildStarterQuestions();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Preconsultation template load failed:', error?.error || error);
        this.questions = this.buildStarterQuestions();
        this.saveError =
          error?.error?.message ||
          error?.error?.details ||
          error?.error?.error ||
          (typeof error?.error === 'string' ? error.error : '') ||
          'Template could not be loaded from the server. You can still configure questions and try saving again.';
        this.isLoading = false;
      },
    });
  }

  private buildStarterQuestions(): PreconsultationQuestion[] {
    return [
      this.buildQuestion('text', 1, 'What is the main reason for your visit today?'),
      {
        ...this.buildQuestion('yes_no', 2, 'Are you experiencing severe pain right now?'),
        isRedFlag: true,
        redFlagValue: true,
      },
      {
        ...this.buildQuestion('multi_choice', 3, 'Which of these symptoms are you having?'),
        options: ['Fever', 'Cough', 'Headache', 'Shortness of breath'],
      },
    ];
  }

  private buildQuestion(
    type: PreconsultationQuestionType,
    order: number,
    text = '',
  ): PreconsultationQuestion {
    return {
      order,
      text,
      type,
      required: true,
      options: this.usesOptions(type) ? ['Option 1', 'Option 2'] : [],
      scaleMin: type === 'scale' ? 0 : null,
      scaleMax: type === 'scale' ? 10 : null,
      isRedFlag: false,
      redFlagValue: null,
      conditionalParentId: null,
      conditionalTriggerValue: null,
    };
  }

  private validateQuestions(): string {
    if (this.questions.length === 0) {
      return 'Add at least one question before saving.';
    }

    for (const [index, question] of this.questions.entries()) {
      if (!question.text.trim()) {
        return `Question ${index + 1} needs text.`;
      }

      if (this.usesOptions(question.type) && (question.options || []).filter((option) => !!String(option).trim()).length < 2) {
        return `Question ${index + 1} needs at least two options.`;
      }

      if (question.type === 'scale' && Number(question.scaleMax ?? 0) <= Number(question.scaleMin ?? 0)) {
        return `Question ${index + 1} needs a valid scale range.`;
      }

      if (question.isRedFlag && this.getRedFlagOptions(question).length > 0 && question.redFlagValue == null) {
        return `Question ${index + 1} needs a red flag trigger value.`;
      }

      if (question.conditionalParentId && this.getConditionalValues(question).length === 0) {
        return `Question ${index + 1} uses a conditional parent that cannot trigger responses.`;
      }
    }

    return '';
  }

  private prepareQuestionsForSave(): PreconsultationQuestion[] {
    return this.questions.map((question, index) => ({
      ...question,
      order: index + 1,
      text: question.text.trim(),
      options: (question.options || []).map((option) => String(option).trim()).filter((option) => !!option),
      scaleMin: question.type === 'scale' ? Number(question.scaleMin ?? 0) : null,
      scaleMax: question.type === 'scale' ? Number(question.scaleMax ?? 10) : null,
      redFlagValue: question.isRedFlag ? question.redFlagValue ?? null : null,
    }));
  }

  private usesOptions(type: PreconsultationQuestionType): boolean {
    return type === 'single_choice' || type === 'multi_choice';
  }

  private supportsConditionalTarget(type: PreconsultationQuestionType): boolean {
    return type === 'yes_no' || type === 'single_choice';
  }
}