export const LAB_SERVICE_TYPES: string[] = [
  'Custom Scan',
  'X-Ray',
  'CT Scan',
  'MRI',
  'Ultrasound',
  'Mammography',
  'DEXA Scan',
];

export const LAB_SERVICE_TYPE_OPTIONS = LAB_SERVICE_TYPES.map((type) => ({
  label: type,
  value: type,
}));
