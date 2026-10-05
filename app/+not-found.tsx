import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, COLORS, Title } from "../src/components/ui";
import { Link } from "expo-router";

export default function NotFound() {
  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.safe}>
      <View style={styles.card}>
        <Title>Page not found</Title>
        <Text style={styles.text}>This screen doesn't exist, but the PDF tools are still ready to use.</Text>
        <Link href="/" asChild>
          <Button title="Back to home" onPress={() => {}} icon="🏠" />
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 24,
  },
  text: { color: COLORS.muted, marginVertical: 12, lineHeight: 22 },
});
