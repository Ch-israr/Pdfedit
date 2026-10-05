import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getToken, setToken } from "../src/api/client";
import { Button, Card, COLORS, Subtitle, Title } from "../src/components/ui";
import { CORE_TOOLS } from "../src/tools";

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    getToken().then((t) => setSignedIn(!!t));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Title>pdfedit</Title>
        <Subtitle>Fast PDF tools on your phone and on the web.</Subtitle>

        <FlatList
          data={CORE_TOOLS}
          keyExtractor={(t) => t.slug}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Link href={`/tool/${item.slug}`} asChild>
              <Pressable style={styles.tile}>
                <Text style={styles.icon}>{item.icon}</Text>
                <Text style={styles.tileTitle}>{item.name}</Text>
                <Text style={styles.tileTag}>{item.tagline}</Text>
              </Pressable>
            </Link>
          )}
        />

        <Card>
          {signedIn ? (
            <>
              <Text style={styles.cardText}>You're signed in — premium limits apply.</Text>
              <Button
                title="Sign out"
                variant="secondary"
                onPress={() => {
                  setToken(null).then(() => setSignedIn(false));
                }}
              />
            </>
          ) : (
            <>
              <Text style={styles.cardText}>
                Sign in for higher limits, or keep using the free tier anonymously.
              </Text>
              <Link href="/signin" asChild>
                <Button title="Sign in / Register" onPress={() => {}} />
              </Link>
            </>
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 16 },
  grid: { paddingVertical: 12 },
  row: { justifyContent: "space-between" },
  tile: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    minHeight: 150,
  },
  icon: { fontSize: 34 },
  tileTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginTop: 8 },
  tileTag: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  cardText: { color: COLORS.text, fontSize: 14, marginBottom: 8 },
});
