import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  ANATOMY_REGIONS,
  AnatomyRegionDefinition,
} from '../../constants/anatomy-library-map';
import { BodyScanLayer } from '../../utils/lab-scan-metadata';

interface BodyMapPathRegion extends AnatomyRegionDefinition {
  key: string;
  path: string;
}

interface SelectedPartItem {
  id: string;
  label: string;
}

interface BodyPartLookupItem {
  id: string;
  label: string;
  view: 'front' | 'back';
}

type ScanSelectorCycleView = 'front' | 'back' | 'list';

const BODY_MAP_PATHS: BodyMapPathRegion[] = ANATOMY_REGIONS.flatMap((region) =>
  region.paths.map((path, index) => ({
    ...region,
    path,
    key: `${region.id}-${index}`,
  })),
);

@Component({
  selector: 'app-body-scan-selector',
  templateUrl: './body-scan-selector.component.html',
  styleUrl: './body-scan-selector.component.css',
})
export class BodyScanSelectorComponent implements OnChanges {
  @Input() title = 'Body Area Map';
  @Input() subtitle = 'Select one or more body areas for this scan request.';
  @Input() selectedPartIds: string[] = [];
  @Input() activeLayers: BodyScanLayer[] = ['surface'];
  @Input() readonly = false;
  @Input() showSelectedList = true;
  @Input() showDoneButton = false;
  @Input() displayMode: 'full' | 'cycle' = 'full';
  @Input() showCycleControl = true;

  @Output() selectedPartIdsChange = new EventEmitter<string[]>();
  @Output() activeLayersChange = new EventEmitter<BodyScanLayer[]>();
  @Output() doneClick = new EventEmitter<void>();

  readonly bodyParts: BodyPartLookupItem[] = ANATOMY_REGIONS.map((region) => ({
    id: region.id,
    label: region.label,
    view: region.view,
  }));
  readonly frontRegions: BodyMapPathRegion[] = BODY_MAP_PATHS.filter(
    (region) => region.view === 'front',
  );
  readonly backRegions: BodyMapPathRegion[] = BODY_MAP_PATHS.filter(
    (region) => region.view === 'back',
  );

  localSelectedPartIds: string[] = [];
  localActiveLayers: BodyScanLayer[] = ['surface'];
  hoveredPartId: string | null = null;
  tooltipLabel = '';
  tooltipX = 0;
  tooltipY = 0;
  currentCycleView: ScanSelectorCycleView = 'front';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedPartIds']) {
      this.localSelectedPartIds = this.normalizePartIds(this.selectedPartIds);
    }

    if (changes['activeLayers']) {
      this.localActiveLayers = this.normalizeLayers(this.activeLayers);
    }

    if (changes['displayMode'] || changes['showSelectedList']) {
      this.ensureCycleViewIsValid();
    }
  }

  togglePart(partId: string): void {
    if (this.readonly) {
      return;
    }

    if (this.localSelectedPartIds.includes(partId)) {
      this.localSelectedPartIds = this.localSelectedPartIds.filter(
        (id) => id !== partId,
      );
    } else {
      this.localSelectedPartIds = [...this.localSelectedPartIds, partId];
    }

    this.selectedPartIdsChange.emit([...this.localSelectedPartIds]);
  }

  isPartSelected(partId: string): boolean {
    return this.localSelectedPartIds.includes(partId);
  }

  isPartHoverPreview(partId: string): boolean {
    return this.hoveredPartId === partId && !this.isPartSelected(partId);
  }

  onRegionMouseEnter(partId: string, event: MouseEvent): void {
    this.hoveredPartId = partId;
    this.tooltipLabel = this.getPartLabel(partId);
    this.updateTooltipPosition(event);
  }

  onRegionMouseMove(partId: string, event: MouseEvent): void {
    if (this.hoveredPartId !== partId) {
      this.hoveredPartId = partId;
      this.tooltipLabel = this.getPartLabel(partId);
    }

    this.updateTooltipPosition(event);
  }

  onRegionMouseLeave(): void {
    this.hoveredPartId = null;
    this.tooltipLabel = '';
  }

  removeSelectedPart(partId: string): void {
    if (this.readonly) {
      return;
    }

    this.localSelectedPartIds = this.localSelectedPartIds.filter(
      (id) => id !== partId,
    );
    this.selectedPartIdsChange.emit([...this.localSelectedPartIds]);
  }

  clearSelectedParts(): void {
    if (this.readonly || this.localSelectedPartIds.length === 0) {
      return;
    }

    this.localSelectedPartIds = [];
    this.selectedPartIdsChange.emit([]);
  }

  emitDone(): void {
    if (this.readonly) {
      return;
    }

    this.doneClick.emit();
  }

  cycleView(): void {
    if (!this.isCycleMode) {
      return;
    }

    const views = this.availableCycleViews;
    const currentIndex = views.indexOf(this.currentCycleView);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % views.length : 0;
    this.currentCycleView = views[nextIndex];
  }

  get selectedPartItems(): SelectedPartItem[] {
    const lookup = new Map(this.bodyParts.map((part) => [part.id, part.label]));
    return this.localSelectedPartIds.map((partId) => ({
      id: partId,
      label: lookup.get(partId) || partId,
    }));
  }

  get showTooltip(): boolean {
    return !!this.hoveredPartId && !!this.tooltipLabel;
  }

  get isCycleMode(): boolean {
    return this.displayMode === 'cycle';
  }

  get cycleButtonLabel(): string {
    switch (this.currentCycleView) {
      case 'front':
        return 'Front Body';
      case 'back':
        return 'Back Body';
      case 'list':
        return 'List View';
      default:
        return 'Front Body';
    }
  }

  get showFrontPanel(): boolean {
    return !this.isCycleMode || this.currentCycleView === 'front';
  }

  get showBackPanel(): boolean {
    return !this.isCycleMode || this.currentCycleView === 'back';
  }

  get showMapGrid(): boolean {
    return !this.isCycleMode || this.currentCycleView !== 'list';
  }

  get showSelectedColumn(): boolean {
    if (!this.showSelectedList) {
      return false;
    }

    return !this.isCycleMode || this.currentCycleView === 'list';
  }

  getPartLabel(partId: string): string {
    return this.bodyParts.find((part) => part.id === partId)?.label || partId;
  }

  private normalizePartIds(values: string[] | null | undefined): string[] {
    const validIds = new Set(this.bodyParts.map((part) => part.id));
    return Array.from(
      new Set((values || []).filter((value) => validIds.has(value))),
    );
  }

  private get availableCycleViews(): ScanSelectorCycleView[] {
    return this.showSelectedList
      ? ['front', 'back', 'list']
      : ['front', 'back'];
  }

  private ensureCycleViewIsValid(): void {
    if (!this.isCycleMode) {
      this.currentCycleView = 'front';
      return;
    }

    const views = this.availableCycleViews;
    if (!views.includes(this.currentCycleView)) {
      this.currentCycleView = views[0];
    }
  }

  private updateTooltipPosition(event: MouseEvent): void {
    this.tooltipX = event.clientX + 14;
    this.tooltipY = event.clientY + 12;
  }

  private normalizeLayers(
    values: BodyScanLayer[] | null | undefined,
  ): BodyScanLayer[] {
    if (values && values.includes('surface')) {
      return ['surface'];
    }

    if (values && values.length > 0) {
      return ['surface'];
    }

    return ['surface'];
  }
}
