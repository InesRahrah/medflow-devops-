import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { DoctorService } from './doctor.service';
import { AuthService } from './auth.service';

export type PreconsultationQuestionType =
  | 'text'
  | 'yes_no'
  | 'single_choice'
  | 'multi_choice'
  | 'scale'
  | 'number';

export type PreconsultationAnswerValue = string | string[] | boolean | number | null;

export interface PreconsultationQuestion {
  id?: number | string;
  order: number;
  text: string;
  type: PreconsultationQuestionType;
  required: boolean;
  options?: string[];
  scaleMin?: number | null;
  scaleMax?: number | null;
  isRedFlag: boolean;
  redFlagValue?: string | boolean | number | null;
  conditionalParentId?: number | string | null;
  conditionalTriggerValue?: string | boolean | number | null;
}

export interface PreconsultationTemplate {
  id?: number | string;
  doctorId?: number | string;
  version?: number | string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  questions: PreconsultationQuestion[];
}

export interface AppointmentPreconsultationForm {
  appointmentId: number | string;
  skipped: boolean;
  reason?: string;
  alreadySubmitted?: boolean;
  template: PreconsultationTemplate | null;
  questions: PreconsultationQuestion[];
}

export interface PreconsultationAnswerSubmission {
  questionId: number | string;
  answer: PreconsultationAnswerValue;
}

export interface PreconsultationResponseAnswer {
  questionId: number | string;
  questionText: string;
  questionType: PreconsultationQuestionType;
  required: boolean;
  answer: PreconsultationAnswerValue;
  isRedFlag: boolean;
}

export interface PreconsultationResponse {
  id?: number | string;
  responseId?: number | string;
  templateId?: number | string;
  appointmentId: number | string;
  patientId?: number | string;
  doctorId?: number | string;
  submittedAt?: string;
  riskLevel: 'routine' | 'priority' | 'urgent';
  answers: PreconsultationResponseAnswer[];
}

@Injectable({
  providedIn: 'root',
})
export class PreconsultationService {
  private readonly apiBaseUrl = '/api/v1';
  private cachedDoctorHeaderId: string | null | undefined = undefined;

  constructor(
    private http: HttpClient,
    private doctorService: DoctorService,
    private authService: AuthService,
  ) {}

  getMyTemplate(): Observable<PreconsultationTemplate | null> {
    const url = `${this.apiBaseUrl}/doctors/me/preconsultation-template`;

    return this.withDoctorContextHeaders((headers) =>
      this.http.get<any>(url, { headers }),
    )
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 400
            ? this.http.get<any>(url)
            : throwError(() => error),
        ),
        map((response) => this.normalizeTemplate(response)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 400 || error.status === 404) {
            return of(null);
          }
          return throwError(() => error);
        }),
      );
  }

  createMyTemplate(questions: PreconsultationQuestion[]): Observable<PreconsultationTemplate> {
    const url = `${this.apiBaseUrl}/doctors/me/preconsultation-template`;
    const payload = this.buildTemplatePayload(questions);
    const fallbackPayload = this.buildTemplateFallbackPayload(questions);

    return this.withDoctorContextHeaders((headers) =>
      this.http.post<any>(
        url,
        payload,
        { headers },
      ),
    )
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 400 || error.status === 404
            ? this.http.post<any>(url, payload)
            : throwError(() => error),
        ),
        catchError((error: HttpErrorResponse) =>
          error.status === 400 || error.status === 404
            ? this.http.post<any>(url, fallbackPayload)
            : throwError(() => error),
        ),
      )
      .pipe(map((response) => this.normalizeTemplate(response)));
  }

  updateMyTemplate(questions: PreconsultationQuestion[]): Observable<PreconsultationTemplate> {
    const url = `${this.apiBaseUrl}/doctors/me/preconsultation-template`;
    const payload = this.buildTemplatePayload(questions);
    const fallbackPayload = this.buildTemplateFallbackPayload(questions);

    return this.withDoctorContextHeaders((headers) =>
      this.http.put<any>(
        url,
        payload,
        { headers },
      ),
    )
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 400 || error.status === 404
            ? this.http.put<any>(url, payload)
            : throwError(() => error),
        ),
        catchError((error: HttpErrorResponse) =>
          error.status === 400 || error.status === 404
            ? this.http.put<any>(url, fallbackPayload)
            : throwError(() => error),
        ),
      )
      .pipe(map((response) => this.normalizeTemplate(response)));
  }

  saveMyTemplate(questions: PreconsultationQuestion[], hasExistingTemplate: boolean): Observable<PreconsultationTemplate> {
    return hasExistingTemplate
      ? this.updateMyTemplate(questions)
      : this.createMyTemplate(questions);
  }

  getAppointmentForm(appointmentId: number | string): Observable<AppointmentPreconsultationForm> {
    return this.http
      .get<any>(`${this.apiBaseUrl}/appointments/${encodeURIComponent(String(appointmentId))}/preconsultation`)
      .pipe(
        map((response) => this.normalizeAppointmentForm(response, appointmentId)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 409) {
            return of({
              appointmentId,
              skipped: false,
              alreadySubmitted: true,
              reason: 'already_submitted',
              template: null,
              questions: [],
            });
          }

          return throwError(() => error);
        }),
      );
  }

  submitAppointmentResponse(
    appointmentId: number | string,
    answers: PreconsultationAnswerSubmission[],
  ): Observable<PreconsultationResponse> {
    return this.http
      .post<any>(`${this.apiBaseUrl}/appointments/${encodeURIComponent(String(appointmentId))}/preconsultation`, {
        answers: answers.map((answer) => ({
          questionId: answer.questionId,
          value: String(answer.answer ?? ''),
        })),
      })
      .pipe(map((response) => this.normalizeResponse(response, appointmentId)));
  }

  getAppointmentResponse(appointmentId: number | string): Observable<PreconsultationResponse> {
    return this.http
      .get<any>(`${this.apiBaseUrl}/appointments/${encodeURIComponent(String(appointmentId))}/preconsultation/response`)
      .pipe(map((response) => this.normalizeResponse(response, appointmentId)));
  }

  private buildTemplatePayload(questions: PreconsultationQuestion[]): Record<string, unknown> {
    return {
      isActive: true,
      questions: this.serializeQuestions(questions),
    };
  }

  private buildTemplateFallbackPayload(questions: PreconsultationQuestion[]): Record<string, unknown> {
    return {
      questions: this.serializeQuestionsFallback(questions),
    };
  }

  private serializeQuestions(questions: PreconsultationQuestion[]): Array<Record<string, unknown>> {
    return questions.map((question, index) => ({
      id: question.id ?? null,
      orderIndex: index,
      text: String(question.text || '').trim(),
      type: question.type,
      required: question.required,
      options: (question.options || []).map((option) => String(option || '').trim()).filter((option) => !!option),
      scaleMin: question.type === 'scale' ? Number(question.scaleMin ?? 0) : null,
      scaleMax: question.type === 'scale' ? Number(question.scaleMax ?? 10) : null,
      isRedFlag: Boolean(question.isRedFlag),
      conditionalParentId: question.conditionalParentId ?? null,
      conditionalTriggerValue: question.conditionalTriggerValue ?? null,
      redFlagValue: question.isRedFlag ? question.redFlagValue ?? null : null,
    }));
  }

  private serializeQuestionsFallback(questions: PreconsultationQuestion[]): Array<Record<string, unknown>> {
    return questions.map((question, index) => {
      const fallback: Record<string, unknown> = {
        order: index + 1,
        text: String(question.text || '').trim(),
        type: question.type,
        required: question.required,
      };

      if (this.usesOptionType(question.type)) {
        fallback['options'] = (question.options || [])
          .map((option) => String(option || '').trim())
          .filter((option) => !!option);
      }

      if (question.type === 'scale') {
        fallback['scaleMin'] = Number(question.scaleMin ?? 0);
        fallback['scaleMax'] = Number(question.scaleMax ?? 10);
      }

      if (question.isRedFlag) {
        fallback['isRedFlag'] = true;
        fallback['redFlagValue'] = question.redFlagValue ?? null;
      }

      if (question.conditionalParentId != null) {
        fallback['conditionalParentId'] = question.conditionalParentId;
      }

      if (question.conditionalTriggerValue != null) {
        fallback['conditionalTriggerValue'] = question.conditionalTriggerValue;
      }

      return fallback;
    });
  }

  private usesOptionType(type: PreconsultationQuestionType): boolean {
    return type === 'single_choice' || type === 'multi_choice';
  }

  private withDoctorContextHeaders<T>(requestFactory: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const userId = this.resolveUserIdForHeader();
    const userRole = this.resolveUserRoleForHeader();

    return this.resolveDoctorIdForHeader().pipe(
      switchMap((doctorId) => {
        const headers = this.buildContextHeaders(userId, userRole, doctorId);
        return requestFactory(headers);
      }),
    );
  }

  private resolveDoctorIdForHeader(): Observable<string | null> {
    if (this.cachedDoctorHeaderId !== undefined) {
      return of(this.cachedDoctorHeaderId);
    }

    const sessionDoctorId = this.resolveDoctorIdFromSession();

    return this.doctorService.getMyDoctorId().pipe(
      map((doctorIdFromMe) => {
        const resolved =
          this.normalizeUserHeaderValue(doctorIdFromMe) ||
          this.normalizeUserHeaderValue(sessionDoctorId);
        this.cachedDoctorHeaderId = resolved;
        return resolved;
      }),
      catchError(() =>
        this.authService.getProfile().pipe(
          take(1),
          map((profile) => {
            const profileDoctorId = this.resolveDoctorIdFromProfile(profile);
            const resolved =
              this.normalizeUserHeaderValue(profileDoctorId) ||
              this.normalizeUserHeaderValue(sessionDoctorId);
            this.cachedDoctorHeaderId = resolved;
            return resolved;
          }),
          catchError(() => {
            const fallback = this.normalizeUserHeaderValue(sessionDoctorId);
            this.cachedDoctorHeaderId = fallback;
            return of(fallback);
          }),
        ),
      ),
    );
  }

  private buildContextHeaders(
    userId: string | null,
    userRole: string | null,
    doctorId: string | null,
  ): HttpHeaders {
    let headers = new HttpHeaders();

    if (userId) {
      headers = headers.set('X-User-Id', userId);
    }

    if (userRole) {
      headers = headers.set('X-User-Role', userRole);
    }

    if (doctorId) {
      headers = headers.set('X-Doctor-Id', doctorId);
    }

    return headers;
  }

  private resolveUserIdForHeader(): string | null {
    const storedInfo = this.authService.getStoredUserInfo();
    const token = this.authService.decodeToken();
    const candidates = [
      this.authService.getUserId(),
      storedInfo?.id,
      storedInfo?.userId,
      storedInfo?.email,
      storedInfo?.username,
      storedInfo?.user?.id,
      storedInfo?.user?.userId,
      storedInfo?.user?.email,
      storedInfo?.user?.username,
      token?.id,
      token?.userId,
      token?.user_id,
      token?.sub,
      token?.email,
      token?.preferred_username,
      token?.username,
      token?.rawId,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeUserHeaderValue(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private resolveUserRoleForHeader(): string | null {
    const role = `${this.authService.getUserRole() || ''}`.trim().toUpperCase();
    return role && role !== 'UNKNOWN' ? role : null;
  }

  private resolveDoctorIdFromSession(): string | null {
    return this.doctorService.getStoredDoctorEntityIdCandidates()[0] ?? null;
  }

  private resolveDoctorIdFromProfile(profile: any): string | null {
    return this.doctorService.getDoctorEntityIdCandidatesFromProfile(profile)[0] ?? null;
  }

  private normalizeUserHeaderValue(candidate: any): string | null {
    const normalized = String(candidate ?? '').trim();
    if (!normalized) {
      return null;
    }

    const lower = normalized.toLowerCase();
    if (lower === 'null' || lower === 'undefined' || lower === '[object object]') {
      return null;
    }

    return normalized;
  }

  private normalizeAppointmentForm(raw: any, appointmentId: number | string): AppointmentPreconsultationForm {
    if (raw?.skipped === true) {
      return {
        appointmentId,
        skipped: true,
        reason: raw?.reason || 'returning_patient',
        alreadySubmitted: false,
        template: null,
        questions: [],
      };
    }

    const template = this.normalizeTemplate(raw);

    return {
      appointmentId,
      skipped: false,
      reason: raw?.reason,
      alreadySubmitted: false,
      template,
      questions: template.questions,
    };
  }

  private normalizeTemplate(raw: any): PreconsultationTemplate {
    const source = raw?.template ?? raw?.data ?? raw;
    const questions = this.extractQuestions(source, raw);

    return {
      id: source?.id ?? source?.templateId ?? raw?.id ?? raw?.templateId,
      doctorId: source?.doctorId ?? source?.doctor?.id ?? raw?.doctorId,
      version: source?.version ?? raw?.version,
      isActive: Boolean(source?.isActive ?? raw?.isActive ?? true),
      createdAt: source?.createdAt ?? raw?.createdAt,
      updatedAt: source?.updatedAt ?? raw?.updatedAt,
      questions,
    };
  }

  private extractQuestions(...sources: any[]): PreconsultationQuestion[] {
    const rawQuestions = sources
      .map((source) => source?.questions ?? source?.data?.questions ?? source?.template?.questions)
      .find((value) => Array.isArray(value));

    if (!Array.isArray(rawQuestions)) {
      return [];
    }

    return rawQuestions
      .map((rawQuestion: any, index: number) => this.normalizeQuestion(rawQuestion, index))
      .sort((left, right) => left.order - right.order);
  }

  private normalizeQuestion(rawQuestion: any, index: number): PreconsultationQuestion {
    const rawType = String(rawQuestion?.type || 'text').toLowerCase().trim();
    const type: PreconsultationQuestionType =
      rawType === 'yes_no' ||
      rawType === 'single_choice' ||
      rawType === 'multi_choice' ||
      rawType === 'scale' ||
      rawType === 'number'
        ? rawType
        : 'text';

    const options = Array.isArray(rawQuestion?.options)
      ? rawQuestion.options.map((option: any) => String(option || '').trim()).filter((option: string) => !!option)
      : [];

    return {
      id: rawQuestion?.id ?? rawQuestion?.questionId,
      order: Number(rawQuestion?.order ?? rawQuestion?.orderIndex ?? index + 1),
      text: String(rawQuestion?.text ?? rawQuestion?.questionText ?? '').trim(),
      type,
      required: Boolean(rawQuestion?.required ?? true),
      options,
      scaleMin: rawQuestion?.scaleMin != null ? Number(rawQuestion.scaleMin) : null,
      scaleMax: rawQuestion?.scaleMax != null ? Number(rawQuestion.scaleMax) : null,
      isRedFlag: Boolean(rawQuestion?.isRedFlag ?? false),
      redFlagValue: rawQuestion?.redFlagValue ?? null,
      conditionalParentId: rawQuestion?.conditionalParentId ?? null,
      conditionalTriggerValue: rawQuestion?.conditionalTriggerValue ?? null,
    };
  }

  private normalizeResponse(raw: any, appointmentId: number | string): PreconsultationResponse {
    const source = raw?.response ?? raw?.data ?? raw;
    const answersSource = source?.answers ?? raw?.answers ?? [];

    return {
      id: source?.id,
      responseId: source?.responseId ?? source?.id,
      templateId: source?.templateId,
      appointmentId: source?.appointmentId ?? appointmentId,
      patientId: source?.patientId,
      doctorId: source?.doctorId,
      submittedAt: source?.submittedAt ?? source?.createdAt,
      riskLevel: this.normalizeRiskLevel(source?.riskLevel),
      answers: Array.isArray(answersSource)
        ? answersSource.map((answer: any) => this.normalizeResponseAnswer(answer))
        : [],
    };
  }

  private normalizeResponseAnswer(rawAnswer: any): PreconsultationResponseAnswer {
    return {
      questionId: rawAnswer?.questionId ?? rawAnswer?.question?.id ?? rawAnswer?.id,
      questionText: String(
        rawAnswer?.questionText ?? rawAnswer?.question?.text ?? rawAnswer?.label ?? 'Question',
      ).trim(),
      questionType: this.normalizeQuestionType(rawAnswer?.questionType ?? rawAnswer?.question?.type),
      required: Boolean(rawAnswer?.required ?? rawAnswer?.question?.required ?? false),
      answer: rawAnswer?.answer ?? rawAnswer?.value ?? null,
      isRedFlag: Boolean(rawAnswer?.isRedFlag ?? false),
    };
  }

  private normalizeQuestionType(rawType: any): PreconsultationQuestionType {
    const normalized = String(rawType || 'text').toLowerCase().trim();
    if (
      normalized === 'yes_no' ||
      normalized === 'single_choice' ||
      normalized === 'multi_choice' ||
      normalized === 'scale' ||
      normalized === 'number'
    ) {
      return normalized;
    }

    return 'text';
  }

  private normalizeRiskLevel(rawRiskLevel: any): 'routine' | 'priority' | 'urgent' {
    const normalized = String(rawRiskLevel || 'routine').toLowerCase().trim();
    if (normalized === 'priority' || normalized === 'urgent') {
      return normalized;
    }
    return 'routine';
  }
}