import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

export function useColors() {
  const { resolvedScheme } = useTheme();
  const palette = resolvedScheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
