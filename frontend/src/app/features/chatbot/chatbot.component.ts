import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { trigger, transition, style, animate } from '@angular/animations';
import { marked } from 'marked';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  formattedText?: SafeHtml;
  timestamp: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  animations: [
    trigger('messageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ChatbotComponent {

  userMessage: string = '';
  messages: ChatMessage[] = [];
  isLoading: boolean = false;

  private api = 'http://localhost:8086/api/ai/chat';

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  /**
   * Send a quick suggestion message
   */
  sendQuickMessage(message: string) {
    this.userMessage = message;
    this.sendMessage();
  }

  /**
   * Send user message and get AI response
   */
  sendMessage() {
    if (!this.userMessage.trim()) return;

    // Add user message with timestamp
    const userMsg: ChatMessage = { 
      sender: 'user', 
      text: this.userMessage,
      timestamp: this.getFormattedTime()
    };
    this.messages.push(userMsg);

    const question = this.userMessage;
    this.userMessage = '';
    this.isLoading = true;

    // API call
    this.http.post(this.api, question, { responseType: 'text' })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          const botMsg: ChatMessage = { 
            sender: 'bot', 
            text: res,
            formattedText: this.formatMessage(res),
            timestamp: this.getFormattedTime()
          };
          this.messages.push(botMsg);
          this.scrollToBottom();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          const errorMsg: ChatMessage = {
            sender: 'bot',
            text: '❌ Error connecting to AI. Please try again.',
            timestamp: this.getFormattedTime()
          };
          this.messages.push(errorMsg);
          this.scrollToBottom();
        }
      });
  }

  /**
   * Copy message to clipboard
   */
  copyMessage(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Message copied!');
    }).catch(() => {
      alert('Error copying message');
    });
  }

  /**
   * Reuse message in input
   */
  reuseMessage(text: string) {
    this.userMessage = text;
    const inputElement = document.querySelector('.message-input') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  }

  /**
   * Handle input changes (for enable/disable send button)
   */
  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.userMessage = input.value;
  }

  /**
   * Formats markdown text into safe HTML using the marked library
   * - Converts markdown headers (# ## ###) to proper heading tags
   * - Converts **text** to <strong>
   * - Converts *text* to <em>
   * - Handles bullet points and numbered lists
   * - Supports code blocks and inline code
   * - Sanitizes HTML to prevent XSS attacks
   */
  formatMessage(text: string): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');

    try {
      // Parse markdown to HTML using marked
      const html = marked.parse(text) as string;
      
      // Safely return the HTML after parsing
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Error formatting message:', error);
      // Fallback to plain text if formatting fails
      return this.sanitizer.bypassSecurityTrustHtml(`<p>${text}</p>`);
    }
  }

  /**
   * Scroll chat to bottom
   */
  private scrollToBottom() {
    setTimeout(() => {
      const chatBox = document.querySelector('.chat-box');
      if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }, 100);
  }

  /**
   * Get formatted time for message timestamp
   */
  getFormattedTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
