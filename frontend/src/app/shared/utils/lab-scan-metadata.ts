import {
  BODY_SCAN_PART_LABELS_BY_ID,
  BODY_SCAN_PARTS,
} from '../constants/body-scan-parts';

export type BodyScanLayer = 'surface' | 'muscle' | 'bone';

export interface LabScanSelection {
  selectedPartIds: string[];
  activeLayers: BodyScanLayer[];
}

export interface ParsedLabScanNotes {
  cleanNotes: string;
  selection: LabScanSelection | null;
}

export const IMAGING_LAB_SERVICE_TYPES: string[] = ['Custom Scan'];

const NORMALIZED_IMAGING_LAB_SERVICE_TYPES = new Set(
  IMAGING_LAB_SERVICE_TYPES.map((type) => normalizeServiceType(type)),
);

const METADATA_PREFIX = '[[LAB_SCAN::';
const METADATA_SUFFIX = ']]';
const VALID_PART_IDS = new Set(BODY_SCAN_PARTS.map((part) => part.id));
const VALID_LAYERS: BodyScanLayer[] = ['surface', 'muscle', 'bone'];
const LEGACY_PART_ID_MAP: Record<string, string[]> = {
  head: ['front_head', 'back_head'],
  neck: ['front_neck', 'back_neck_left', 'back_neck_right'],
  chest: ['front_chest_left', 'front_chest_right'],
  spine: [
    'back_trapezius_left',
    'back_trapezius_right',
    'back_upper_back_left',
    'back_upper_back_right',
    'back_lower_back_left',
    'back_lower_back_right',
  ],
  abdomen: [
    'front_abs_left',
    'front_abs_right',
    'front_obliques_left',
    'front_obliques_right',
  ],
  pelvis: [
    'front_adductors_left',
    'front_adductors_right',
    'back_gluteal_left',
    'back_gluteal_right',
  ],
  left_upper_arm: [
    'front_biceps_left',
    'front_triceps_left',
    'back_triceps_left',
  ],
  right_upper_arm: [
    'front_biceps_right',
    'front_triceps_right',
    'back_triceps_right',
  ],
  left_forearm: ['front_forearm_left', 'back_forearm_left'],
  right_forearm: ['front_forearm_right', 'back_forearm_right'],
  left_hand: ['front_hands_left', 'back_hands_left'],
  right_hand: ['front_hands_right', 'back_hands_right'],
  left_thigh: ['front_quadriceps_left', 'back_hamstring_left'],
  right_thigh: ['front_quadriceps_right', 'back_hamstring_right'],
  left_knee: ['front_knees_left'],
  right_knee: ['front_knees_right'],
  left_lower_leg: [
    'front_tibialis_left',
    'front_calves_left',
    'back_calves_left',
  ],
  right_lower_leg: [
    'front_tibialis_right',
    'front_calves_right',
    'back_calves_right',
  ],
  left_foot: ['front_feet_left', 'back_feet_left'],
  right_foot: ['front_feet_right', 'back_feet_right'],
  front_left_shoulder: ['front_deltoids_left'],
  front_right_shoulder: ['front_deltoids_right'],
  front_abdomen: ['front_abs_left', 'front_abs_right'],
  front_pelvis: ['front_adductors_left', 'front_adductors_right'],
  front_left_upper_arm: ['front_biceps_left', 'front_triceps_left'],
  front_right_upper_arm: ['front_biceps_right', 'front_triceps_right'],
  front_left_forearm: ['front_forearm_left'],
  front_right_forearm: ['front_forearm_right'],
  front_left_hand: ['front_hands_left'],
  front_right_hand: ['front_hands_right'],
  front_left_thigh: ['front_quadriceps_left'],
  front_right_thigh: ['front_quadriceps_right'],
  front_left_knee: ['front_knees_left'],
  front_right_knee: ['front_knees_right'],
  front_left_shin: ['front_tibialis_left'],
  front_right_shin: ['front_tibialis_right'],
  front_left_foot: ['front_feet_left'],
  front_right_foot: ['front_feet_right'],
  back_neck: ['back_neck_left', 'back_neck_right'],
  back_left_shoulder: ['back_deltoids_left'],
  back_right_shoulder: ['back_deltoids_right'],
  back_spine: [
    'back_trapezius_left',
    'back_trapezius_right',
    'back_upper_back_left',
    'back_upper_back_right',
    'back_lower_back_left',
    'back_lower_back_right',
  ],
  back_lower_back: ['back_lower_back_left', 'back_lower_back_right'],
  back_left_upper_arm: ['back_triceps_left'],
  back_right_upper_arm: ['back_triceps_right'],
  back_left_forearm: ['back_forearm_left'],
  back_right_forearm: ['back_forearm_right'],
  back_left_hand: ['back_hands_left'],
  back_right_hand: ['back_hands_right'],
  back_left_glute: ['back_gluteal_left'],
  back_right_glute: ['back_gluteal_right'],
  back_left_thigh: ['back_hamstring_left'],
  back_right_thigh: ['back_hamstring_right'],
  back_left_knee: ['back_hamstring_left', 'back_calves_left'],
  back_right_knee: ['back_hamstring_right', 'back_calves_right'],
  back_left_calf: ['back_calves_left'],
  back_right_calf: ['back_calves_right'],
  back_left_foot: ['back_feet_left'],
  back_right_foot: ['back_feet_right'],
};

export function isImagingLabServiceType(value: string): boolean {
  const normalized = normalizeServiceType(value);
  if (!normalized) {
    return false;
  }

  return NORMALIZED_IMAGING_LAB_SERVICE_TYPES.has(normalized);
}

export function sanitizeLabScanSelection(
  selection: Partial<LabScanSelection> | null | undefined,
): LabScanSelection | null {
  if (!selection) {
    return null;
  }

  const rawPartIds = Array.isArray(selection.selectedPartIds)
    ? selection.selectedPartIds
    : [];
  const selectedPartIds = Array.from(
    new Set(
      rawPartIds
        .filter((id): id is string => typeof id === 'string')
        .flatMap((id) => normalizePartId(id)),
    ),
  );

  const rawLayers = Array.isArray(selection.activeLayers)
    ? selection.activeLayers
    : [];
  const activeLayers = Array.from(
    new Set(
      rawLayers.filter(
        (layer): layer is BodyScanLayer =>
          typeof layer === 'string' &&
          VALID_LAYERS.includes(layer as BodyScanLayer),
      ),
    ),
  );

  if (activeLayers.length === 0) {
    activeLayers.push('surface');
  }

  if (selectedPartIds.length === 0) {
    return null;
  }

  return {
    selectedPartIds,
    activeLayers,
  };
}

export function buildLabRequestNotes(
  notes: string,
  selection: Partial<LabScanSelection> | null | undefined,
): string | undefined {
  const cleanNotes = (notes || '').trim();
  const cleanSelection = sanitizeLabScanSelection(selection);

  const sections: string[] = [];
  if (cleanNotes) {
    sections.push(cleanNotes);
  }

  if (cleanSelection) {
    sections.push(
      `${METADATA_PREFIX}${JSON.stringify(cleanSelection)}${METADATA_SUFFIX}`,
    );
  }

  if (sections.length === 0) {
    return undefined;
  }

  return sections.join('\n\n');
}

export function parseLabRequestNotes(rawNotes?: string): ParsedLabScanNotes {
  const raw = (rawNotes || '').trim();
  if (!raw) {
    return {
      cleanNotes: '',
      selection: null,
    };
  }

  const regex = /\[\[LAB_SCAN::([\s\S]*?)\]\]/g;
  const matches = Array.from(raw.matchAll(regex));
  const lastMatch = matches.length > 0 ? matches[matches.length - 1] : null;

  let selection: LabScanSelection | null = null;
  if (lastMatch && lastMatch[1]) {
    try {
      const parsed = JSON.parse(lastMatch[1]);
      selection = sanitizeLabScanSelection(parsed);
    } catch {
      selection = null;
    }
  }

  const cleanNotes = raw
    .replace(regex, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    cleanNotes,
    selection,
  };
}

export function getLabScanPartLabel(partId: string): string {
  return BODY_SCAN_PART_LABELS_BY_ID[partId] || partId;
}

export function hasLabScanSelection(rawNotes?: string): boolean {
  return !!parseLabRequestNotes(rawNotes).selection;
}

function normalizePartId(partId: string): string[] {
  if (VALID_PART_IDS.has(partId)) {
    return [partId];
  }

  const mappedIds = LEGACY_PART_ID_MAP[partId];
  if (!mappedIds) {
    return [];
  }

  return mappedIds.filter((id) => VALID_PART_IDS.has(id));
}

function normalizeServiceType(value: string): string {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}
