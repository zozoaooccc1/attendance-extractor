import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import colors from "@/constants/colors";

export function useColors() {
  const { resolvedScheme } = useTheme();
  const { highContrast } = useSettings();
  if (highContrast) {
    return { ...colors.highContrast, radius: colors.radius };
  }
  const palette = resolvedScheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
