
import { Component, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { VoiceChatService } from '../../../core/services/voice-chat.service';

interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
  time: string;
  audioUrl?: string;
}


@Component({
  selector: 'app-patient-chat-widget',
  templateUrl: './patient-chat-widget.component.html',
  styleUrls: ['./patient-chat-widget.component.css'],
  
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('0.3s', style({ opacity: 1, transform: 'none' }))
      ])
    ])
  ]
})
export class PatientChatWidgetComponent implements AfterViewInit {
  sidebarOpen = false;
  sidebarWidth = 380;
  private resizing = false;
  private startX = 0;
  private startWidth = 380;

  messages: ChatMessage[] = [];
  inputValue = '';
  isTyping = false;
  isRecording = false;
  ttsEnabled = true;

  @ViewChild('chatBody') chatBody!: ElementRef;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private voiceChatService: VoiceChatService
  ) {}

  ngAfterViewInit() {
    this.scrollToBottom();
  }


  sendMessage() {
    if (!this.inputValue.trim()) return;
    const msg: ChatMessage = {
      from: 'user',
      text: this.inputValue,
      time: this.getTime()
    };
    this.messages.push(msg);
    const userMessage = this.inputValue;
    this.inputValue = '';
    this.scrollToBottom();
    this.isTyping = true;

      // Get user ID using AuthService (same as appointment logic)
      let userId = this.authService.getPatientEntityId();
      if (!userId) {
        console.warn('[ChatWidget] No userId found. User may not be logged in or profile is incomplete.');
        userId = '';
      }
      userId = String(userId); // Ensure always a string for header
      console.log('[ChatWidget] Extracted userId from AuthService:', userId);

    this.http.post<{ reply: string }>(
      'http://localhost:8000/conversation/message',
      { message: userMessage },
      { headers: { 'X-User-Id': userId } }
    ).subscribe({
      next: (response: any) => {
        this.isTyping = false;
        const replyText = response.reply;
        this.messages.push({
          from: 'assistant',
          text: replyText,
          time: this.getTime()
        });
        this.scrollToBottom();
        if (this.ttsEnabled) {
          this.voiceChatService.speak(replyText);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isTyping = false;
        this.messages.push({
          from: 'assistant',
          text: 'Sorry, there was a problem connecting to the assistant.',
          time: this.getTime()
        });
        this.scrollToBottom();
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    setTimeout(() => this.scrollToBottom(), 200);
  }

  sendQuick(text: string) {
    this.inputValue = text;
    this.sendMessage();
  }

  getAssistantReply(userText: string): string {
    // Simple canned responses for demo
    if (/appointment/i.test(userText)) return 'Sure! I can help you book an appointment.';
    if (/symptom/i.test(userText)) return 'Please describe your symptoms, and I will assist you.';
    if (/doctor/i.test(userText)) return 'What kind of doctor are you looking for?';
    return 'I am here to help!';
  }

  getTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatBotMessage(text: string): { intro: string; items: { num: string; type: string; date: string }[]; outro: string } {
    const items: { num: string; type: string; date: string }[] = [];
    let intro = '';
    let outro = '';

    const segments = text.split(/(?=\d+\.)/).filter(s => s.trim());

    let foundItems = false;
    for (const seg of segments) {
      const match = seg.match(/^(\d+)\.\s*(?:🏥)?\s*(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?\s*—\s*(.+?)\s*$/);
      if (match) {
        foundItems = true;
        const dateObj = new Date(match[2] + 'T' + match[3]);
        const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + match[3];
        items.push({ num: match[1], type: match[4].trim().replace(/_/g, ' '), date: formatted });
      } else if (!foundItems) {
        intro += seg;
      } else {
        outro += seg;
      }
    }

    return { intro: intro.trim(), items, outro: outro.trim() };
  }

  hasListItems(text: string): boolean {
    return /\d+\.\s*(?:🏥)?\s*\d{4}-\d{2}-\d{2}T/.test(text);
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatBody && this.chatBody.nativeElement) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    }, 100);
  }

  toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private startRecording(): void {
    this.voiceChatService
      .startRecording()
      .then(() => {
        this.isRecording = true;
      })
      .catch((err) => {
        console.error('[ChatWidget] Mic access denied:', err);
      });
  }

  private stopRecording(): void {
    this.isRecording = false;

    // Show user message instantly — before waiting for the blob
    const userMsg: ChatMessage = {
      from: 'user',
      text: '🎤 Processing voice...',
      time: this.getTime(),
    };
    this.messages.push(userMsg);
    this.isTyping = true;
    this.scrollToBottom();

    this.voiceChatService.stopRecording().subscribe((blob) => {
      const voiceUrl = URL.createObjectURL(blob);
      userMsg.audioUrl = voiceUrl;

      let userId = this.authService.getPatientEntityId();
      if (!userId) userId = '';
      userId = String(userId);

      this.voiceChatService.sendVoice(blob, userId).subscribe({
        next: (res) => {
          this.isTyping = false;
          if (this.ttsEnabled) {
            this.voiceChatService.cancelSpeech();
          }

          // Update placeholder with actual transcription
          userMsg.text = res.transcription;

          // Show reply as assistant message
          this.messages.push({
            from: 'assistant',
            text: res.reply,
            time: this.getTime(),
          });
          this.scrollToBottom();

          if (this.ttsEnabled) {
            this.voiceChatService.speak(res.reply);
          }
        },
        error: () => {
          this.isTyping = false;
          userMsg.text = '🎤 Voice message (transcription failed)';
          this.messages.push({
            from: 'assistant',
            text: 'Sorry, I could not process your voice message.',
            time: this.getTime(),
          });
          this.scrollToBottom();
        },
      });
    });
  }

  toggleTts(): void {
    this.ttsEnabled = !this.ttsEnabled;
    if (!this.ttsEnabled) {
      this.voiceChatService.cancelSpeech();
    }
  }

  speakText(text: string): void {
    this.voiceChatService.speak(text);
  }

  private currentAudio: HTMLAudioElement | null = null;
  playingAudioUrl: string | null = null;

  togglePlayAudio(url: string): void {
    if (this.currentAudio && this.playingAudioUrl === url) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.playingAudioUrl = null;
      return;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    this.currentAudio = new Audio(url);
    this.playingAudioUrl = url;
    this.currentAudio.onended = () => {
      this.playingAudioUrl = null;
      this.currentAudio = null;
    };
    this.currentAudio.play();
  }

  // Resizing logic (optional, can be removed if not needed)
  startResizing(event: MouseEvent) {
    this.resizing = true;
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth;
    document.addEventListener('mousemove', this.resizeSidebar);
    document.addEventListener('mouseup', this.stopResizing);
  }
  resizeSidebar = (event: MouseEvent) => {
    if (!this.resizing) return;
    const dx = this.startX - event.clientX;
    let newWidth = this.startWidth + dx;
    if (newWidth < 280) newWidth = 280;
    if (newWidth > window.innerWidth * 0.9) newWidth = window.innerWidth * 0.9;
    this.sidebarWidth = newWidth;
  };
  stopResizing = () => {
    this.resizing = false;
    document.removeEventListener('mousemove', this.resizeSidebar);
    document.removeEventListener('mouseup', this.stopResizing);
  };

  @HostListener('window:resize')
  onWindowResize() {
    if (this.sidebarWidth > window.innerWidth * 0.9) {
      this.sidebarWidth = window.innerWidth * 0.9;
    }
  }
}
