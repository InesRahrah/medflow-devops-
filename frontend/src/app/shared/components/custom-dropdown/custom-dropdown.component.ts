import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  HostListener,
  ElementRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-dropdown',
  templateUrl: './custom-dropdown.component.html',
  styleUrls: ['./custom-dropdown.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDropdownComponent),
      multi: true,
    },
  ],
})
export class CustomDropdownComponent implements ControlValueAccessor {
  @Input() options: any[] = []; // Array of strings or { label: string, value: any }
  @Input() placeholder: string = 'Select...';
  @Input() label: string = '';
  @Input() searchable: boolean = false;

  isOpen = false;
  value: any = null;
  isDisabled = false;
  searchTerm = '';

  private static openInstance: CustomDropdownComponent | null = null;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(private elementRef: ElementRef) {}

  toggleDropdown(event: Event): void {
    if (this.isDisabled) return;

    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    if (
      CustomDropdownComponent.openInstance &&
      CustomDropdownComponent.openInstance !== this
    ) {
      CustomDropdownComponent.openInstance.close();
    }
    this.searchTerm = '';
    this.isOpen = true;
    CustomDropdownComponent.openInstance = this;
    this.onTouched();
  }

  private close(): void {
    this.isOpen = false;
    if (CustomDropdownComponent.openInstance === this) {
      CustomDropdownComponent.openInstance = null;
    }
  }

  selectOption(option: any): void {
    if (this.isDisabled) return;
    const newValue = typeof option === 'string' ? option : option.value;
    this.value = newValue;
    this.onChange(newValue);
    this.searchTerm = '';
    this.close();
  }

  get filteredOptions(): any[] {
    if (!this.searchable) {
      return this.options;
    }

    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.options;
    }

    return this.options.filter((opt) =>
      this.getLabel(opt).toLowerCase().includes(query),
    );
  }

  onSearchInput(event: Event): void {
    event.stopPropagation();
    this.searchTerm = (event.target as HTMLInputElement).value || '';
  }

  get displayValue(): string {
    if (!this.value) return this.placeholder;
    const found = this.options.find(
      (opt) => (typeof opt === 'string' ? opt : opt.value) === this.value,
    );
    if (!found) return this.value;
    return this.getLabel(found);
  }

  getLabel(option: any): string {
    return typeof option === 'string' ? option : option.label;
  }

  isSelected(option: any): boolean {
    const optValue = typeof option === 'string' ? option : option.value;
    return optValue === this.value;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
