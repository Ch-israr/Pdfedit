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
} from "../../src/api/client";
import {
  Button,
  Card,
  COLORS,
  ProgressBar,
  Subtitle,
  Title,
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

  async function pickFiles() {
    const res = await DocumentPicker.getDocumentAsync({
      type: tool.accept,
      multiple: tool.multiple,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    setFiles(
      res.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType,
      }))
    );
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
    if (files.length === 0) return;
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
      <ScrollView style={styles.container}>
        <Title>
          {tool.icon} {tool.name}
        </Title>
        <Subtitle>{tool.tagline}</Subtitle>

        <Card>
          <Button title={files.length ? "Change files" : "Choose PDF files"} onPress={pickFiles} />
          {files.map((f, i) => (
            <View key={`${f.uri}-${i}`} style={styles.fileRow}>
              <Text style={styles.fileName} numberOfLines={1}>
                {i + 1}. {f.name}
              </Text>
              <View style={styles.fileActions}>
                {tool.multiple && (
                  <>
                    <Pressable onPress={() => moveFile(i, -1)} style={styles.mini}>
                      <Text style={styles.miniText}>↑</Text>
                    </Pressable>
                    <Pressable onPress={() => moveFile(i, 1)} style={styles.mini}>
                      <Text style={styles.miniText}>↓</Text>
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={() => setFiles((p) => p.filter((_, j) => j !== i))}
                  style={styles.mini}
                >
                  <Text style={styles.miniText}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>

        {tool.slug === "split-pdf" && (
          <Card>
            <Text style={styles.label}>Split mode</Text>
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
                <Text style={styles.label}>Ranges (e.g. 1-3, 5, 8-10)</Text>
                <TextInput
                  style={styles.input}
                  value={ranges}
                  onChangeText={setRanges}
                  placeholder="1-3, 5"
                  placeholderTextColor={COLORS.muted}
                />
              </>
            )}
          </Card>
        )}

        {tool.slug === "compress-pdf" && (
          <Card>
            <Text style={styles.label}>Compression level</Text>
            <View style={styles.choiceRow}>
              {["low", "medium", "high"].map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLevel(l)}
                  style={[styles.choice, level === l && styles.choiceActive]}
                >
                  <Text style={styles.choiceText}>{l[0].toUpperCase() + l.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {!!error && (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        )}

        <Button
          title={busy ? "Working…" : `Run ${tool.name}`}
          onPress={run}
          disabled={files.length === 0 || busy}
          loading={busy}
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
          <Card>
            <Text style={styles.ok}>Done — your file is ready.</Text>
            <Button title="Download / Share result" onPress={saveResult} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 16 },
  label: { color: COLORS.muted, fontSize: 13, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.text,
    padding: 12,
    fontSize: 16,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fileName: { flex: 1, color: COLORS.text, fontSize: 14 },
  fileActions: { flexDirection: "row" },
  mini: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 4,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
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
  },
  choiceActive: { borderColor: COLORS.accent, backgroundColor: "#0c2a3d" },
  choiceText: { color: COLORS.text, fontWeight: "600" },
  error: { color: COLORS.danger },
  ok: { color: COLORS.success, marginBottom: 8, fontSize: 15 },
  statusText: { color: COLORS.text, fontSize: 15, marginBottom: 4 },
});
