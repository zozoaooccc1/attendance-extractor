import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";

export default function NotFoundScreen() {
  const colors = useColors();
  const { t, isRTL } = useSettings();

  return (
    <>
      <Stack.Screen options={{ title: isRTL ? "عذراً" : "Oops!" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isRTL ? "هذه الشاشة غير موجودة." : "This screen doesn't exist."}
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {isRTL ? "العودة للشاشة الرئيسية" : "Go to home screen!"}
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
