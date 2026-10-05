import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  downloadUrl,
  getJobStatus,
  submitJob,
  type JobStatus,
  type PickedFile,
  validatePdfFiles,
} from "../../src/api/client";
import {
  Button,
  Card,
  COLORS,
  ProgressBar,
  StepIndicator,
  Subtitle,
  Title,
  FilePreview,
} from "../../src/components/ui";
import { TOOL_MAP } from "../../src/tools";

export default function ToolScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const tool = TOOL_MAP[slug ?? ""];
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [splitMode, setSplitMode] = useState<"ranges" | "single">("ranges");
  const [ranges, setRanges] = useState("");
  const [level, setLevel] = useState("medium");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  if (!tool) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Title>Unknown tool</Title>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = files.length === 0 ? 0 : job ? 3 : 1;

  function parseRanges(raw: string): string[] {
    if (!raw.trim()) return [];
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function validateForm(): string | null {
    const pdfValidation = validatePdfFiles(files);
    if (pdfValidation) return pdfValidation;

    if (tool.slug === "split-pdf") {
      if (splitMode === "ranges") {
        const parts = parseRanges(ranges);
        if (parts.length === 0) {
          return "Specify at least one page range like 1-3, 5, 8-10.";
        }
        for (const part of parts) {
          if (!/^\d+(?:-\d+)?$/.test(part)) {
            return "Ranges must use a format like 1-3, 5, 8-10.";
          }
        }
      }
    }

    return null;
  }

  async function pickFiles() {
    const res = await DocumentPicker.getDocumentAsync({
      type: tool.accept,
      multiple: tool.multiple,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const nextFiles = (res.assets ?? []).map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: typeof asset.size === "number" ? asset.size : undefined,
    }));
    setFiles(nextFiles);
    setJob(null);
    setError("");
  }

  function moveFile(index: number, dir: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function options(): Record<string, string> {
    if (tool.slug === "split-pdf") {
      return splitMode === "single" ? { mode: "single" } : { mode: "ranges", ranges };
    }
    if (tool.slug === "compress-pdf") {
      return { level };
    }
    return {};
  }

  async function run() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (files.length === 0) {
      setError("Choose a PDF file before continuing.");
      return;
    }

    setBusy(true);
    setError("");
    setJob(null);

    try {
      const { job_id } = await submitJob(tool.slug, files, options());
      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(job_id);
          setJob(status);
          if (status.status === "completed" || status.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setBusy(false);
            if (status.status === "failed") {
              setError(status.error || "Processing failed.");
            }
          }
        } catch (e) {
          if (pollRef.current) clearInterval(pollRef.current);
          setBusy(false);
          setError(e instanceof Error ? e.message : "Status check failed.");
        }
      }, 2000);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  async function saveResult() {
    if (!job?.download_url) return;
    const url = downloadUrl(job.download_url);
    const name = job.file_name ?? "pdfedit-result.pdf";
    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const dest = FileSystem.documentDirectory + name;
    const { uri } = await FileSystem.downloadAsync(url, dest);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: tool.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Title>{tool.icon} {tool.name}</Title>
        <Subtitle>{tool.tagline}</Subtitle>

        <StepIndicator
          currentStep={currentStep}
          totalSteps={4}
          labels={["Choose", "Options", "Process", "Download"]}
        />

        <Card>
          <Text style={styles.label}>Step 1: Upload a PDF</Text>
          <Button
            title={files.length ? "Choose different files" : "Browse PDF files"}
            onPress={pickFiles}
            icon="📎"
          />
          {files.length === 0 && (
            <Text style={styles.helperText}>Only PDF files are supported. Large files are validated before processing.</Text>
          )}
          {files.map((file, index) => (
            <View key={`${file.uri}-${index}`}>
              <FilePreview
                index={index}
                total={files.length}
                name={file.name}
                size={file.size}
                onRemove={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
              />
              {tool.multiple && (
                <View style={styles.fileActions}>
                  <Pressable onPress={() => moveFile(index, -1)} style={styles.miniButton}>
                    <Text style={styles.miniText}>↑</Text>
                  </Pressable>
                  <Pressable onPress={() => moveFile(index, 1)} style={styles.miniButton}>
                    <Text style={styles.miniText}>↓</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </Card>

        {tool.slug === "split-pdf" && (
          <Card>
            <Text style={styles.label}>Step 2: Choose split mode</Text>
            <View style={styles.choiceRow}>
              {(["ranges", "single"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setSplitMode(m)}
                  style={[styles.choice, splitMode === m && styles.choiceActive]}
                >
                  <Text style={styles.choiceText}>
                    {m === "ranges" ? "Page ranges" : "Every page"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {splitMode === "ranges" && (
              <>
                <Text style={styles.label}>Pages to keep</Text>
                <TextInput
                  style={styles.input}
                  value={ranges}
                  onChangeText={setRanges}
                  placeholder="1-3, 5, 8-10"
                  placeholderTextColor={COLORS.muted}
                />
              </>
            )}
          </Card>
        )}

        {tool.slug === "compress-pdf" && (
          <Card>
            <Text style={styles.label}>Step 2: Compression level</Text>
            <View style={styles.choiceRow}>
              {["low", "medium", "high"].map((levelOption) => (
                <Pressable
                  key={levelOption}
                  onPress={() => setLevel(levelOption)}
                  style={[styles.choice, level === levelOption && styles.choiceActive]}
                >
                  <Text style={styles.choiceText}>{levelOption[0].toUpperCase() + levelOption.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {!!error && (
          <Card variant="danger">
            <Text style={styles.error}>{error}</Text>
          </Card>
        )}

        <Button
          title={busy ? "Working…" : `Process ${tool.name}`}
          onPress={run}
          disabled={files.length === 0 || busy}
          loading={busy}
          icon="⚙️"
        />

        {job && (job.status === "pending" || job.status === "processing") && (
          <Card>
            <Text style={styles.statusText}>
              {job.status === "pending" ? "Queued…" : "Processing…"} {job.progress}%
            </Text>
            <ProgressBar progress={job.progress} />
          </Card>
        )}

        {job?.status === "completed" && (
          <Card variant="success">
            <Text style={styles.ok}>Your file is ready. Download or share it below.</Text>
            <Button title="Download / Share result" onPress={saveResult} icon="⬇️" />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 16 },
  contentContainer: { paddingBottom: 32 },
  label: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 6, fontWeight: "600" },
  helperText: { color: COLORS.muted, marginTop: 8, fontSize: 12, lineHeight: 18 },
  input: {
    backgroundColor: "#0f172a",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.text,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  fileActions: { flexDirection: "row", marginTop: 8 },
  miniButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginRight: 8,
  },
  miniText: { color: COLORS.text, fontSize: 14 },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  choice: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  choiceActive: { borderColor: COLORS.accent, backgroundColor: "#0c2a3d" },
  choiceText: { color: COLORS.text, fontWeight: "600" },
  error: { color: COLORS.danger, fontSize: 14, fontWeight: "600" },
  ok: { color: COLORS.success, marginBottom: 8, fontSize: 15, fontWeight: "600" },
  statusText: { color: COLORS.text, fontSize: 15, marginBottom: 6, fontWeight: "600" },
});
