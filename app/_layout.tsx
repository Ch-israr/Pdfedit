import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../src/components/ui";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.bg },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "pdfedit" }} />
        <Stack.Screen name="tool/[slug]" options={{ title: "Tool" }} />
        <Stack.Screen name="signin" options={{ title: "Sign in" }} />
      </Stack>
    </>
  );
}
