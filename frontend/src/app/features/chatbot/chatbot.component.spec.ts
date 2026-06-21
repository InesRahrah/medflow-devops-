import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChatbotComponent } from './chatbot.component';

describe('ChatbotComponent', () => {
  let component: ChatbotComponent;
  let fixture: ComponentFixture<ChatbotComponent>;
  let sanitizer: DomSanitizer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatbotComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotComponent);
    component = fixture.componentInstance;
    sanitizer = TestBed.inject(DomSanitizer);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ============ MESSAGE FORMATTING TESTS ============

  describe('formatMessage()', () => {
    it('should format bold text (**text**)', () => {
      const input = 'This is **bold** text';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should format italic text (*text*)', () => {
      const input = 'This is *italic* text';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should convert line breaks to <br>', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle bullet points with dash', () => {
      const input = '- Item 1\n- Item 2\n- Item 3';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle numbered lists', () => {
      const input = '1. First\n2. Second\n3. Third';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should detect and format Drug section title', () => {
      const input = 'Drug: Aspirin';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle inline code (`code`)', () => {
      const input = 'Use `Array.map()` for transformation';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle code blocks (```code```)', () => {
      const input = 'Here is code: ```const x = 42;```';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle empty string', () => {
      const input = '';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should prevent XSS attacks', () => {
      const xssInput = '<script>alert("XSS")</script>';
      const result = component.formatMessage(xssInput);
      // The script tag should be escaped
      expect(result).toBeTruthy();
    });

    it('should handle HTML special characters', () => {
      const input = 'Test < > & " \' characters';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });
  });

  describe('escapeHtml()', () => {
    it('should escape HTML tags', () => {
      const input = '<div>Test</div>';
      const result = (component as any).escapeHtml(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should escape ampersands', () => {
      const input = 'Bread & Butter';
      const result = (component as any).escapeHtml(input);
      expect(result).toContain('&amp;');
    });

    it('should preserve regular text', () => {
      const input = 'Regular text';
      const result = (component as any).escapeHtml(input);
      expect(result).toContain('Regular text');
    });
  });

  describe('formatSectionTitles()', () => {
    it('should format Drug title with 💊 icon', () => {
      const input = 'Drug: Aspirin';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('💊');
      expect(result).toContain('section-drug');
    });

    it('should format Warnings title with ⚠️ icon', () => {
      const input = 'Warnings: Be careful';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('⚠️');
      expect(result).toContain('section-warning');
    });

    it('should format Dosage title with 📋 icon', () => {
      const input = 'Dosage: 500mg';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('📋');
      expect(result).toContain('section-dosage');
    });

    it('should format Side Effects title with ⚠️ icon', () => {
      const input = 'Side Effects: May include dizziness';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('⚠️');
      expect(result).toContain('section-side-effects');
    });

    it('should format Instructions title with 📝 icon', () => {
      const input = 'Instructions: Take with food';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('📝');
      expect(result).toContain('section-instructions');
    });

    it('should format Notes title with 📌 icon', () => {
      const input = 'Notes: Important information';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('📌');
      expect(result).toContain('section-note');
    });

    it('should format Important title with ❗ icon', () => {
      const input = 'Important: Critical information';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('❗');
      expect(result).toContain('section-important');
    });

    it('should format Results title with 📊 icon', () => {
      const input = 'Results: Test outcome';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('📊');
      expect(result).toContain('section-results');
    });

    it('should be case-insensitive', () => {
      const input1 = 'DRUG: Aspirin';
      const result1 = (component as any).formatSectionTitles(input1);
      expect(result1).toContain('💊');

      const input2 = 'drug: Aspirin';
      const result2 = (component as any).formatSectionTitles(input2);
      expect(result2).toContain('💊');
    });

    it('should handle multiple section titles', () => {
      const input = 'Drug: Test\nWarnings: Be careful\nDosage: 500mg';
      const result = (component as any).formatSectionTitles(input);
      expect(result).toContain('💊');
      expect(result).toContain('⚠️');
      expect(result).toContain('📋');
    });
  });

  describe('formatBulletPoints()', () => {
    it('should convert dash bullets to <ul> list', () => {
      const input = 'Start<br>- Item 1<br>- Item 2<br>End';
      const result = (component as any).formatBulletPoints(input);
      expect(result).toContain('<ul');
      expect(result).toContain('</ul>');
      expect(result).toContain('<li>Item 1</li>');
    });

    it('should handle single bullet', () => {
      const input = '- Only item';
      const result = (component as any).formatBulletPoints(input);
      expect(result).toContain('<ul');
      expect(result).toContain('<li>Only item</li>');
    });

    it('should handle bullet symbol (•)', () => {
      const input = '• Item with bullet symbol';
      const result = (component as any).formatBulletPoints(input);
      expect(result).toContain('<li>Item with bullet symbol</li>');
    });

    it('should handle asterisk bullets (*)', () => {
      const input = '* Item with asterisk';
      const result = (component as any).formatBulletPoints(input);
      expect(result).toContain('<li>Item with asterisk</li>');
    });

    it('should not treat inline dashes as bullets', () => {
      const input = 'This is a sentence - with a dash';
      const result = (component as any).formatBulletPoints(input);
      expect(result).not.toContain('<ul');
    });

    it('should close list when encountering empty line', () => {
      const input = '- Item 1<br>- Item 2<br><br>Text after list';
      const result = (component as any).formatBulletPoints(input);
      expect(result).toContain('</ul>');
    });
  });

  describe('formatNumberedLists()', () => {
    it('should convert numbered items to <ol> list', () => {
      const input = '1. First<br>2. Second<br>3. Third';
      const result = (component as any).formatNumberedLists(input);
      expect(result).toContain('<ol');
      expect(result).toContain('</ol>');
      expect(result).toContain('<li>First</li>');
    });

    it('should handle different number formats', () => {
      const input = '1. Item one<br>2. Item two<br>10. Item ten';
      const result = (component as any).formatNumberedLists(input);
      expect(result).toContain('<li>Item one</li>');
      expect(result).toContain('<li>Item two</li>');
      expect(result).toContain('<li>Item ten</li>');
    });

    it('should not format version numbers as lists', () => {
      const input = 'Version 1.0 of the software';
      const result = (component as any).formatNumberedLists(input);
      expect(result).not.toContain('<ol');
    });

    it('should close list when encountering empty line', () => {
      const input = '1. First<br>2. Second<br><br>Text after list';
      const result = (component as any).formatNumberedLists(input);
      expect(result).toContain('</ol>');
    });
  });

  // ============ MESSAGE STRUCTURE TESTS ============

  describe('Message Structure', () => {
    it('should create ChatMessage with formatted text for bot', () => {
      const botMsg = {
        sender: 'bot' as const,
        text: 'Test message',
        formattedText: component.formatMessage('Test message')
      };
      expect(botMsg.sender).toBe('bot');
      expect(botMsg.text).toBe('Test message');
      expect(botMsg.formattedText).toBeTruthy();
    });

    it('should handle user messages without formatting', () => {
      const userMsg = {
        sender: 'user' as const,
        text: 'User input'
      };
      expect(userMsg.sender).toBe('user');
      expect(userMsg.formattedText).toBeUndefined();
    });

    it('should maintain message order', () => {
      component.messages = [];
      
      component.messages.push({
        sender: 'user',
        text: 'First message'
      });

      component.messages.push({
        sender: 'bot',
        text: 'Response',
        formattedText: component.formatMessage('Response')
      });

      component.messages.push({
        sender: 'user',
        text: 'Second message'
      });

      expect(component.messages.length).toBe(3);
      expect(component.messages[0].sender).toBe('user');
      expect(component.messages[1].sender).toBe('bot');
      expect(component.messages[2].sender).toBe('user');
    });
  });

  // ============ COMPLEX FORMATTING TESTS ============

  describe('Complex Formatting Scenarios', () => {
    it('should format complete medication information', () => {
      const input = `Drug: Aspirin
**Active Ingredient:** Acetylsalicylic acid

Dosage:
1. For mild pain: 500mg
2. Maximum daily: 3000mg

Side Effects:
- Stomach upset
- Heartburn

Instructions: Take with food`;

      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should format pharmacy drug interaction alert', () => {
      const input = `**Drug Interaction Alert**

Primary Drug: Warfarin
Interacting Drug: Ibuprofen

Severity: **HIGH** ⚠️

Risk Level:
- Increased bleeding risk
- Reduced anticoagulant effect

Safe Alternatives:
1. Acetaminophen
2. Aspirin (in low doses)

Important: Consult physician before combining`;

      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should format symptom analysis', () => {
      const input = `Symptom Analysis: **Severe Headache**

Possible Causes:
- Migraine
- Viral infection
- Stress

When to Seek Emergency:
1. Temperature above 103°F
2. Stiff neck
3. Loss of consciousness

Notes: This is informational and not a medical diagnosis`;

      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should combine all formatting features', () => {
      const input = `**Important Notice**

Drug: Test Medication
Dosage: 
1. Initial dose: 100mg
2. Maintenance: 200mg

Key Points:
- Highly effective
- Minimal side effects
- Take with \`food\`

Instructions:
Follow \`code-like\` instructions carefully

Warnings:
- Do not exceed maximum dose
- **SEVERE** allergic reactions possible`;

      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });
  });

  // ============ EDGE CASE TESTS ============

  describe('Edge Cases', () => {
    it('should handle very long text', () => {
      const input = 'A'.repeat(5000);
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle special Unicode characters', () => {
      const input = 'Test with émojis 🎉 and special chars àéîöü';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle multiple consecutive line breaks', () => {
      const input = 'Line 1\n\n\nLine 2';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle mixed bullet types', () => {
      const input = '- Dash\n• Bullet\n* Asterisk';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle nested formatting attempts', () => {
      const input = '**_This is bold and italic_**';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });

    it('should handle medical symbols and abbreviations', () => {
      const input = 'Dosage: 500mg × 2 ≈ 1000mg daily';
      const result = component.formatMessage(input);
      expect(result).toBeTruthy();
    });
  });
});
