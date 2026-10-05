import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { login, register } from "../src/api/client";
import { Button, Card, COLORS, Subtitle, Title } from "../src/components/ui";

type Phase = "idle" | "working" | "done" | "error";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  async function submit() {
    setPhase("working");
    setError("");
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: mode === "login" ? "Sign in" : "Create account" }} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Title>{mode === "login" ? "Welcome back" : "Create your account"}</Title>
          <Subtitle>
            {mode === "login"
              ? "Sign in to unlock premium limits and keep your workflow synced."
              : "Free accounts can get started quickly and upgrade when needed."}
          </Subtitle>

          <Card>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={COLORS.muted}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={COLORS.muted}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}
            {phase === "done" && <Text style={styles.ok}>Done — you're signed in.</Text>}

            <Button
              title={mode === "login" ? "Sign in" : "Create account"}
              onPress={submit}
              loading={phase === "working"}
              disabled={!email || !password}
              icon="🔐"
            />
          </Card>

          <Button
            title={mode === "login" ? "No account? Register instead" : "Have an account? Sign in instead"}
            variant="secondary"
            onPress={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setPhase("idle");
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  keyboardAvoider: { flex: 1 },
  container: { flexGrow: 1, padding: 16, justifyContent: "center" },
  label: { color: COLORS.muted, fontSize: 13, marginTop: 12, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: "#0f172a",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.text,
    padding: 12,
    fontSize: 16,
  },
  error: { color: COLORS.danger, marginTop: 12, fontWeight: "600" },
  ok: { color: COLORS.success, marginTop: 12, fontWeight: "600" },
});
