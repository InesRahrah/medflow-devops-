import { ANATOMY_REGIONS } from './anatomy-library-map';

export interface BodyScanPartDefinition {
  id: string;
  label: string;
  view: 'front' | 'back';
}

export const BODY_SCAN_PARTS: BodyScanPartDefinition[] = ANATOMY_REGIONS.map(
  (region) => ({
    id: region.id,
    label: region.label,
    view: region.view,
  }),
);

export const BODY_SCAN_PART_LABELS_BY_ID = Object.fromEntries(
  BODY_SCAN_PARTS.map((part) => [part.id, part.label]),
) as Record<string, string>;
