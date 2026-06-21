import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PreconsultationResponse,
  PreconsultationResponseAnswer,
  PreconsultationService,
} from '../../core/services/preconsultation.service';

@Component({
  selector: 'app-doctor-preconsultation-response',
  templateUrl: './doctor-preconsultation-response.component.html',
  styleUrl: './doctor-preconsultation-response.component.css',
})
export class DoctorPreconsultationResponseComponent implements OnInit {
  appointmentId = '';
  response: PreconsultationResponse | null = null;
  isLoading = true;
  loadError = '';
  aiSummarySections: { icon: string; label: string; text: string }[] = [];
  isAiSummary = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private preconsultationService: PreconsultationService,
  ) {}

  ngOnInit(): void {
    this.appointmentId = String(this.route.snapshot.paramMap.get('appointmentId') || '');
    if (!this.appointmentId) {
      this.loadError = 'No appointment was provided for this intake review.';
      this.isLoading = false;
      return;
    }

    this.preconsultationService.getAppointmentResponse(this.appointmentId).subscribe({
      next: (response) => {
        this.response = response;
        this.detectAiSummary();
        this.isLoading = false;
      },
      error: (error) => {
        this.loadError =
          error?.status === 404
            ? 'The patient has not submitted preconsultation answers for this appointment yet.'
            : error?.error?.message || 'Unable to load this preconsultation response.';
        this.isLoading = false;
      },
    });
  }

  get flaggedAnswersCount(): number {
    return (this.response?.answers || []).filter((answer) => answer.isRedFlag).length;
  }

  formatAnswer(answer: PreconsultationResponseAnswer): string {
    if (Array.isArray(answer.answer)) {
      return answer.answer.join(', ');
    }

    if (typeof answer.answer === 'boolean') {
      return answer.answer ? 'Yes' : 'No';
    }

    return String(answer.answer ?? 'No answer provided').trim() || 'No answer provided';
  }

  formatSubmittedAt(value?: string): string {
    if (!value) {
      return 'Unknown';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  }

  goBack(): void {
    this.router.navigate(['/doctor']);
  }

  private detectAiSummary(): void {
    if (!this.response?.answers?.length) return;

    const aiAnswer = this.response.answers.find(
      (a) =>
        String(a.questionText || '')
          .toLowerCase()
          .includes('ai-generated') ||
        String(a.questionText || '')
          .toLowerCase()
          .includes('ai summary'),
    );
    if (!aiAnswer) return;

    const raw = String(aiAnswer.answer ?? '').trim();
    if (!raw) return;

    this.isAiSummary = true;

    const sectionMap: Record<string, { icon: string; label: string }> = {
      'chief complaint': { icon: 'fa-comment-medical', label: 'Chief Complaint' },
      'symptoms reported': { icon: 'fa-heartbeat', label: 'Symptoms Reported' },
      'urgency assessment': { icon: 'fa-exclamation-triangle', label: 'Urgency Assessment' },
      'relevant context': { icon: 'fa-notes-medical', label: 'Relevant Context' },
      'suggested focus areas': { icon: 'fa-bullseye', label: 'Suggested Focus Areas' },
    };

    const lines = raw.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const rawLabel = line.substring(0, colonIdx).trim();
      const text = line.substring(colonIdx + 1).trim();
      if (!text) continue;

      const key = rawLabel.toLowerCase();
      const mapped = Object.keys(sectionMap).find((k) => key.includes(k));
      const meta = mapped
        ? sectionMap[mapped]
        : { icon: 'fa-info-circle', label: rawLabel };

      this.aiSummarySections.push({ icon: meta.icon, label: meta.label, text });
    }

    if (this.aiSummarySections.length === 0) {
      this.aiSummarySections.push({
        icon: 'fa-robot',
        label: 'AI Summary',
        text: raw,
      });
    }
  }
}