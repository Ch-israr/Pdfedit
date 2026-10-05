import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

export const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
  accent: "#38bdf8",
  accentDark: "#0369a1",
  success: "#34d399",
  danger: "#f87171",
};

export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}) {
  const bg =
    variant === "primary"
      ? COLORS.accent
      : variant === "danger"
        ? COLORS.danger
        : COLORS.card;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#0f172a" : "#fff"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: variant === "primary" ? "#0f172a" : COLORS.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginVertical: 6,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  track: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 8,
  },
  fill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 5 },
});
