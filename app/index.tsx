import { Link } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, COLORS, Subtitle, Title, ToolCard } from "../src/components/ui";
import { CORE_TOOLS } from "../src/tools";

export default function Home() {
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>PDF tools for work and everyday use</Text>
        <Title style={styles.heroTitle}>Convert, merge, split, and compress PDFs in seconds.</Title>
        <Subtitle style={styles.heroSubtitle}>
          Clean PDF workflows for mobile and web — built for quick edits without losing document quality.
        </Subtitle>

        <View style={styles.ctaRow}>
          <Link href="/tool/merge-pdf" asChild>
            <Button title="Start now" onPress={() => {}} />
          </Link>
          <Link href="/signin" asChild>
            <Button title="Sign in" variant="secondary" onPress={() => {}} />
          </Link>
        </View>
      </View>

      <Card>
        <Title size="small" style={styles.sectionTitle}>Why choose pdfedit?</Title>
        <View style={styles.featureGrid}>
          {[
            ["⚡", "Fast processing", "Submit jobs quickly and track progress in real time."],
            ["🔒", "Private by design", "Your files stay in your control while the backend handles the job."],
            ["📱", "Mobile-first", "Use the same interface on your phone, tablet, or desktop."],
          ].map(([icon, label, description]) => (
            <View key={label} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureLabel}>{label}</Text>
              <Text style={styles.featureDescription}>{description}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Title size="small">Popular tools</Title>
        <Text style={styles.sectionHint}>Everything you need for everyday PDF editing</Text>
      </View>

      <View style={styles.toolGrid}>
        {CORE_TOOLS.map((tool) => (
          <Link key={tool.slug} href={`/tool/${tool.slug}`} asChild>
            <ToolCard
              icon={tool.icon}
              title={tool.name}
              description={tool.tagline}
              onPress={() => {}}
            />
          </Link>
        ))}
      </View>

      <Card>
        <Title size="small" style={styles.sectionTitle}>How it works</Title>
        <View style={styles.steps}>
          {[
            ["1", "Upload your PDF"],
            ["2", "Choose options"],
            ["3", "Process and download"],
          ].map(([step, text]) => (
            <View key={step} style={styles.stepPill}>
              <Text style={styles.stepNumber}>{step}</Text>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Title size="small" style={styles.sectionTitle}>FAQ</Title>
        <View style={styles.faqList}>
          <Text style={styles.faqQuestion}>What file types are supported?</Text>
          <Text style={styles.faqAnswer}>The app is designed for PDF inputs. Only valid PDF files are accepted.</Text>

          <Text style={styles.faqQuestion}>Does processing happen on my device?</Text>
          <Text style={styles.faqAnswer}>PDF work is handled through the backend API so the app stays lightweight and consistent across platforms.</Text>

          <Text style={styles.faqQuestion}>Can I use it on mobile?</Text>
          <Text style={styles.faqAnswer}>Yes — the same workflow is optimized for iPhone, Android, tablet, and desktop browsers.</Text>
        </View>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>pdfedit</Text>
        <Text style={styles.footerMuted}>Powerful PDF tools without the complexity.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#111827",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  ctaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 8,
  },
  sectionHint: {
    color: COLORS.muted,
    fontSize: 13,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  featureItem: {
    width: "32%",
    minWidth: 120,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  toolGrid: {
    marginTop: 8,
  },
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  stepPill: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepNumber: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 18,
  },
  stepText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  faqList: {
    marginTop: 8,
  },
  faqQuestion: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  faqAnswer: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  footer: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 8,
  },
  footerText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  footerMuted: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
});
