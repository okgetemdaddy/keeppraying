export interface ColorPalette {
  id: string;
  label: string;
  colors: string[];
}

export const BUILTIN_PALETTES: ColorPalette[] = [
  {
    id: "mildliner",
    label: "Mildliner",
    colors: [
      "#FFC5A8", "#FFD98E", "#FFEAA7", "#FCD5CE", "#F8B4B4",
      "#B5D8EB", "#A8D8EA", "#C3C6FF", "#D5B4E0", "#B8E0D2",
      "#D4C5A9", "#C8B6A6", "#9C9583", "#786C5E", "#3D3529",
    ],
  },
  {
    id: "earth",
    label: "Earth Tones",
    colors: [
      "#8B4513", "#A0522D", "#CD853F", "#DEB887", "#2F4F4F",
      "#556B2F", "#6B8E23", "#808000", "#BDB76B", "#DAA520",
    ],
  },
  {
    id: "theological",
    label: "Theological",
    colors: [
      "#7B2D8E", "#B91C1C", "#0891B2", "#1D4ED8", "#DC2626",
      "#15803D", "#D97706", "#1F2937", "#DB2777", "#B8860B",
    ],
  },
  {
    id: "dark-neon",
    label: "Dark Mode",
    colors: [
      "#FF6B6B", "#FECA57", "#48DBFB", "#FF9FF3", "#54A0FF",
      "#5F27CD", "#01A3A4", "#F368E0", "#FF6348", "#7BED9F",
    ],
  },
];
