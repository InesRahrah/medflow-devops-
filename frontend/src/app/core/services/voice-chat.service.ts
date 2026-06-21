import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VoiceChatService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private englishVoice: SpeechSynthesisVoice | null = null;

  constructor(private http: HttpClient) {
    this.loadEnglishVoice();
    // Voices may load async in some browsers
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadEnglishVoice();
    }
  }

  private loadEnglishVoice(): void {
    const voices = speechSynthesis.getVoices();
    // Prefer a native English voice (US/UK/AU), non-local-service first
    this.englishVoice =
      voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('google us')) ||
      voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('google uk')) ||
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => v.lang === 'en-GB') ||
      voices.find((v) => v.lang.startsWith('en')) ||
      null;
  }

  startRecording(): Promise<void> {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.stream = stream;
      this.audioChunks = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      this.mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    });
  }

  stopRecording(): Observable<Blob> {
    const subject = new Subject<Blob>();

    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      subject.error('No active recording');
      return subject.asObservable();
    }

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.audioChunks, {
        type: this.mediaRecorder?.mimeType || 'audio/webm',
      });
      this.audioChunks = [];
      this.releaseStream();
      subject.next(blob);
      subject.complete();
    };

    this.mediaRecorder.stop();
    return subject.asObservable();
  }

  sendVoice(
    audioBlob: Blob,
    userId: string
  ): Observable<{ transcription: string; reply: string }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    return this.http.post<{ transcription: string; reply: string }>(
      'http://localhost:8000/conversation/voice',
      formData,
      { headers: { 'X-User-Id': userId } }
    );
  }

  /** Browser-native TTS */
  speak(text: string): void {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (this.englishVoice) {
      utterance.voice = this.englishVoice;
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }

  cancelSpeech(): void {
    speechSynthesis.cancel();
  }

  private releaseStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
