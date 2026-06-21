import {
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-multi-dropdown',
  templateUrl: './custom-multi-dropdown.component.html',
  styleUrls: ['./custom-multi-dropdown.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomMultiDropdownComponent),
      multi: true,
    },
  ],
})
export class CustomMultiDropdownComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() placeholder = 'Select...';
  @Input() delimiter = ', ';
  @Input() emitAs: 'array' | 'comma' = 'array';

  isOpen = false;
  selectedValues: any[] = [];
  isDisabled = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(private elementRef: ElementRef) {}

  toggleDropdown(event: Event): void {
    if (this.isDisabled) return;
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    this.onTouched();
  }

  toggleOption(event: Event, option: any): void {
    if (this.isDisabled) return;
    event.stopPropagation();

    const optionValue = this.getOptionValue(option);
    const index = this.selectedValues.findIndex(
      (value) => value === optionValue,
    );

    if (index >= 0) {
      this.selectedValues.splice(index, 1);
    } else {
      this.selectedValues.push(optionValue);
    }

    this.emitSelection();
  }

  get displayValue(): string {
    if (this.selectedValues.length === 0) return this.placeholder;

    const labels = this.selectedValues.map((value) => {
      const found = this.options.find(
        (opt) => this.getOptionValue(opt) === value,
      );
      return found ? this.getLabel(found) : String(value);
    });

    return labels.join(this.delimiter);
  }

  getLabel(option: any): string {
    return typeof option === 'string' ? option : option.label;
  }

  getOptionValue(option: any): any {
    return typeof option === 'string' ? option : option.value;
  }

  isSelected(option: any): boolean {
    return this.selectedValues.includes(this.getOptionValue(option));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  writeValue(value: any): void {
    if (Array.isArray(value)) {
      this.selectedValues = [...value];
      return;
    }

    if (typeof value === 'string') {
      this.selectedValues = value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      return;
    }

    this.selectedValues = [];
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  private emitSelection(): void {
    if (this.emitAs === 'comma') {
      this.onChange(this.selectedValues.join(this.delimiter));
      return;
    }

    this.onChange([...this.selectedValues]);
  }
}
