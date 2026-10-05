import { Link } from "expo-router";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Button, COLORS, Title } from "../src/components/ui";

export default function NotFound() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Title>Page not found</Title>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" asChild>
          <Button title="Back to home" onPress={() => {}} />
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 16, justifyContent: "center" },
  text: { color: COLORS.muted, marginVertical: 8 },
});
