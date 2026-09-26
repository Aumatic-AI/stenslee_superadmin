// Canonical feature-key registry, mirrored from the studio app's
// src/lib/permissions/feature-keys.ts. This is the single source of truth
// for what a plan or an org-level override can grant — every plan editor
// and permissions screen in this app renders from this list rather than
// hand-typing keys, so a new feature only ever needs to be added here once.
export const FEATURE_KEYS = [
  "customer_management",
  "upload_existing",
  "browse_previous",
  "ai_design",
  "rework",
  "text_tattoo",
  "flash_isolate",
  "enhance_prompt",
  "pinterest_search",
  "camera_capture",
  "placement",
  "print_stencil",
  "designer_seats",
  "admin_seats",
  "admin_dashboard",
  "trash_retention",
  "storage_quota",
  "design_library",
  "library_file_size_limit",
  "catalog",
  "whatsapp",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureCategory = "Core" | "Design Flow" | "Team" | "Data" | "Integrations";

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
  category: FeatureCategory;
  kind: "toggle" | "limit";
  unit?: string;
}

export const FEATURE_REGISTRY: Record<FeatureKey, FeatureMeta> = {
  customer_management: {
    key: "customer_management",
    label: "Customer Management",
    description: "Look up and create customers by phone.",
    category: "Core",
    kind: "toggle",
  },
  admin_dashboard: {
    key: "admin_dashboard",
    label: "Admin Dashboard",
    description: "Studio-wide KPIs, trends, and designer leaderboard.",
    category: "Core",
    kind: "toggle",
  },
  catalog: {
    key: "catalog",
    label: "Style Catalog",
    description: "Full 70+ style catalog for design sessions.",
    category: "Core",
    kind: "toggle",
  },
  upload_existing: {
    key: "upload_existing",
    label: "Upload Existing",
    description: "Start a session from an uploaded design instead of generating one.",
    category: "Design Flow",
    kind: "toggle",
  },
  browse_previous: {
    key: "browse_previous",
    label: "Browse Previous Designs",
    description: "Reuse designs from earlier sessions.",
    category: "Design Flow",
    kind: "toggle",
  },
  ai_design: {
    key: "ai_design",
    label: "AI Design",
    description: "Generate and refine tattoo designs via KEI. Shared usage pool with Rework and Flash Isolate.",
    category: "Design Flow",
    kind: "limit",
    unit: "generations / mo",
  },
  rework: {
    key: "rework",
    label: "Rework",
    description: "Cover-up / extend flow. Draws from the AI Design usage pool.",
    category: "Design Flow",
    kind: "limit",
    unit: "generations / mo",
  },
  flash_isolate: {
    key: "flash_isolate",
    label: "Flash Isolate",
    description: "Isolate a finalized design onto a plain background for stencils. Draws from the AI Design usage pool.",
    category: "Design Flow",
    kind: "limit",
    unit: "generations / mo",
  },
  text_tattoo: {
    key: "text_tattoo",
    label: "Text Tattoo",
    description: "Typography-driven text tattoo generation mode.",
    category: "Design Flow",
    kind: "toggle",
  },
  enhance_prompt: {
    key: "enhance_prompt",
    label: "Enhance Prompt",
    description: "GPT-4o-mini description enhancement (3 variations).",
    category: "Design Flow",
    kind: "limit",
    unit: "calls / mo",
  },
  pinterest_search: {
    key: "pinterest_search",
    label: "Pinterest Search",
    description: "Reference-image search against Pinterest.",
    category: "Design Flow",
    kind: "limit",
    unit: "searches / mo",
  },
  camera_capture: {
    key: "camera_capture",
    label: "Camera Capture",
    description: "In-browser camera capture for reference/body photos.",
    category: "Design Flow",
    kind: "toggle",
  },
  placement: {
    key: "placement",
    label: "Placement",
    description: "Body placement editor + composite generation.",
    category: "Design Flow",
    kind: "limit",
    unit: "generations / mo",
  },
  print_stencil: {
    key: "print_stencil",
    label: "Print Stencil",
    description: "Multi-page A4 stencil PDF export.",
    category: "Design Flow",
    kind: "toggle",
  },
  designer_seats: {
    key: "designer_seats",
    label: "Designer Seats",
    description: "Max active designer accounts. Checked live against staff headcount, not usage logs.",
    category: "Team",
    kind: "limit",
    unit: "seats",
  },
  admin_seats: {
    key: "admin_seats",
    label: "Admin Seats",
    description: "Max active admin accounts. Checked live against staff headcount, not usage logs.",
    category: "Team",
    kind: "limit",
    unit: "seats",
  },
  trash_retention: {
    key: "trash_retention",
    label: "Trash Retention",
    description: "Days a soft-deleted session stays recoverable before the purge job hard-deletes it.",
    category: "Data",
    kind: "limit",
    unit: "days",
  },
  design_library: {
    key: "design_library",
    label: "Design Library",
    description: "Nested folder library for reference/design images, with zip upload.",
    category: "Core",
    kind: "toggle",
  },
  storage_quota: {
    key: "storage_quota",
    label: "Storage Quota",
    description: "Total Design Library storage allowance for this organization.",
    category: "Data",
    kind: "limit",
    unit: "MB",
  },
  library_file_size_limit: {
    key: "library_file_size_limit",
    label: "Library File Size Limit",
    description: "Max size for a single image uploaded to the Design Library.",
    category: "Data",
    kind: "limit",
    unit: "MB",
  },
  whatsapp: {
    key: "whatsapp",
    label: "WhatsApp",
    description: "WhatsApp integration for customer notifications.",
    category: "Integrations",
    kind: "toggle",
  },
};

export const FEATURE_CATEGORIES: FeatureCategory[] = ["Core", "Design Flow", "Team", "Data", "Integrations"];

export function featuresByCategory(category: FeatureCategory): FeatureMeta[] {
  return FEATURE_KEYS.map((k) => FEATURE_REGISTRY[k]).filter((f) => f.category === category);
}

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}
