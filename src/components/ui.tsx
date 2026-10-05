import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
  Dimensions,
  Platform,
} from "react-native";

export const COLORS = {
  bg: "#0f172a",
  bgAlt: "#1a1f3a",
  card: "#1e293b",
  border: "#334155",
  borderLight: "#475569",
  text: "#f1f5f9",
  textSecondary: "#cbd5e1",
  muted: "#94a3b8",
  accent: "#38bdf8",
  accentDark: "#0369a1",
  accentHover: "#0ea5e9",
  success: "#34d399",
  successLight: "#a7f3d0",
  danger: "#f87171",
  dangerLight: "#fecaca",
  warning: "#fbbf24",
};

export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  loading,
  icon,
  size = "default",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  icon?: string;
  size?: "default" | "small" | "large";
}) {
  const bgColor =
    variant === "primary"
      ? COLORS.accent
      : variant === "danger"
        ? COLORS.danger
        : variant === "ghost"
          ? "transparent"
          : COLORS.card;
  const textColor =
    variant === "primary"
      ? "#0f172a"
      : variant === "ghost"
        ? COLORS.accent
        : COLORS.text;
  const borderColor = variant === "ghost" ? COLORS.accent : "transparent";

  const sizeStyle =
    size === "small"
      ? { paddingVertical: 8, paddingHorizontal: 12 }
      : size === "large"
        ? { paddingVertical: 16, paddingHorizontal: 28 }
        : { paddingVertical: 12, paddingHorizontal: 20 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        sizeStyle,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === "ghost" ? 1 : 0,
          opacity: disabled || loading ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon && <Text style={{ fontSize: 16 }}>{icon}</Text>}
          <Text style={[styles.buttonText, { color: textColor }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  variant = "default",
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "accent" | "success" | "danger";
}) {
  const borderColor =
    variant === "accent"
      ? COLORS.accent
      : variant === "success"
        ? COLORS.success
        : variant === "danger"
          ? COLORS.danger
          : COLORS.border;

  return (
    <View
      style={[
        styles.card,
        { borderColor, borderWidth: variant === "default" ? 1 : 2 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({
  children,
  style,
  size = "large",
}: {
  children: React.ReactNode;
  style?: TextStyle;
  size?: "small" | "large";
}) {
  return (
    <Text
      style={[
        styles.title,
        size === "small" ? { fontSize: 20 } : { fontSize: 28 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Subtitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function ProgressBar({ progress }: { progress: number }) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clampedProgress}%` }]} />
    </View>
  );
}

export function StatusBadge({
  status,
  message,
}: {
  status: "success" | "error" | "warning" | "info";
  message: string;
}) {
  const bgColor =
    status === "success"
      ? COLORS.successLight
      : status === "error"
        ? COLORS.dangerLight
        : status === "warning"
          ? "#fef3c7"
          : "#e0f2fe";
  const textColor =
    status === "success"
      ? "#047857"
      : status === "error"
        ? "#991b1b"
        : status === "warning"
          ? "#92400e"
          : "#0c4a6e";

  return (
    <Card
      variant={status === "success" ? "success" : status === "error" ? "danger" : "default"}
    >
      <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>
        {status === "success"
          ? "✓ "
          : status === "error"
            ? "✕ "
            : status === "warning"
              ? "⚠ "
              : "ℹ "}
        {message}
      </Text>
    </Card>
  );
}

export function ToolCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolCard,
        {
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={styles.toolIcon}>{icon}</Text>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolDescription}>{description}</Text>
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
        <Text style={{ color: COLORS.accent, fontSize: 14, fontWeight: "600" }}>
          Open tool →
        </Text>
      </View>
    </Pressable>
  );
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}) {
  return (
    <View style={styles.stepContainer}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View key={i} style={{ flex: 1, alignItems: "center" }}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  i < currentStep ? COLORS.success : i === currentStep ? COLORS.accent : COLORS.border,
              },
            ]}
          >
            {i < currentStep ? (
              <Text style={{ fontSize: 14, color: "#0f172a", fontWeight: "bold" }}>✓</Text>
            ) : (
              <Text style={{ fontSize: 12, color: COLORS.text, fontWeight: "bold" }}>
                {i + 1}
              </Text>
            )}
          </View>
          {i < totalSteps - 1 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: i < currentStep ? COLORS.success : COLORS.border },
              ]}
            />
          )}
          <Text style={styles.stepLabel}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export function FilePreview({
  name,
  size,
  onRemove,
  index,
  total,
}: {
  name: string;
  size?: number;
  onRemove: () => void;
  index: number;
  total: number;
}) {
  const sizeStr = size
    ? size > 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : size > 1024
        ? `${(size / 1024).toFixed(1)} KB`
        : `${size} B`
    : "";

  return (
    <View style={styles.filePreview}>
      <View style={{ flex: 1 }}>
        <Text style={styles.filePreviewName} numberOfLines={1}>
          {index + 1}. {name}
        </Text>
        {sizeStr && <Text style={styles.filePreviewSize}>{sizeStr}</Text>}
      </View>
      <Pressable onPress={onRemove} style={styles.fileRemoveBtn}>
        <Text style={{ fontSize: 18, color: COLORS.danger }}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  buttonText: { fontSize: 15, fontWeight: "700" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
  },
  title: {
    color: COLORS.text,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: { color: COLORS.muted, fontSize: 14, marginBottom: 12 },
  track: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: "hidden",
    marginVertical: 12,
  },
  fill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 6 },
  toolCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 6,
  },
  toolIcon: { fontSize: 36, marginBottom: 8 },
  toolTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  toolDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  stepContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepLine: {
    width: 2,
    height: 24,
    marginVertical: 4,
  },
  stepLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgAlt,
    borderRadius: 10,
    borderColor: COLORS.border,
    borderWidth: 1,
    marginVertical: 6,
  },
  filePreviewName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  filePreviewSize: {
    color: COLORS.muted,
    fontSize: 12,
  },
  fileRemoveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});