export interface CoreTool {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  multiple: boolean;
  accept: string[];
}

/** The four launch tools for pdfedit v1. */
export const CORE_TOOLS: CoreTool[] = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    tagline: "Combine several PDFs into one document, in your order.",
    icon: "🧩",
    multiple: true,
    accept: ["application/pdf"],
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    tagline: "Pull out page ranges, or split every page into its own file.",
    icon: "✂️",
    multiple: false,
    accept: ["application/pdf"],
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    tagline: "Shrink large PDFs for sharing and email.",
    icon: "🗜️",
    multiple: false,
    accept: ["application/pdf"],
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    tagline: "Turn a PDF into an editable Word document.",
    icon: "📝",
    multiple: false,
    accept: ["application/pdf"],
  },
];

export const TOOL_MAP: Record<string, CoreTool> = Object.fromEntries(
  CORE_TOOLS.map((t) => [t.slug, t])
);
