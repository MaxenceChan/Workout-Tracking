import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const normalizeExerciseAliases = (value) => {
  if (!value) return "";
  let normalized = value;
  const replacements = [
    [/\bbench press\b/g, "developpe couche"],
    [/\bincline bench\b/g, "developpe incline"],
    [/\bdecline bench\b/g, "developpe decline"],
    [/\boverhead press\b/g, "developpe militaire"],
    [/\bmilitary press\b/g, "developpe militaire"],
    [/\bshoulder press\b/g, "developpe militaire"],
    [/\blat pulldown\b/g, "tirage poitrine"],
    [/\bpull ?up\b/g, "tractions"],
    [/\bchin ?up\b/g, "tractions supination"],
    [/\bstiff leg deadlift\b/g, "souleve de terre jambes tendues"],
    [/\bdeadlift\b/g, "souleve de terre"],
  ];
  replacements.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  return normalized;
};

const normalizeExerciseName = (value) => {
  if (!value) return "";
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeExerciseAliases(normalized);
};

const stopTokens = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "a",
  "au",
  "aux",
  "avec",
  "sans",
  "sur",
  "en",
]);
const tokenReplacements = {
  dc: ["developpe", "couche"],
  di: ["developpe", "incline"],
  dd: ["developpe", "decline"],
  dm: ["developpe", "militaire"],
  sdt: ["souleve", "de", "terre"],
  rdl: ["romanian", "deadlift"],
};
const tokenizeExercise = (value) =>
  normalizeExerciseName(value)
    .split(" ")
    .filter(Boolean)
    .flatMap((token) => tokenReplacements[token] || [token])
    .filter((token) => token && !stopTokens.has(token));

const jaccardSimilarity = (aTokens, bTokens) => {
  if (!aTokens.length || !bTokens.length) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let intersection = 0;
  aSet.forEach((token) => {
    if (bSet.has(token)) intersection += 1;
  });
  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersection / union;
};

let ragCache = null;
const loadMuscleRag = async () => {
  if (ragCache) return ragCache;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ragPath = resolve(__dirname, "../src/data/muscleRag.json");
  const raw = await readFile(ragPath, "utf-8");
  const muscleRag = JSON.parse(raw);
  ragCache = {
    data: muscleRag,
    entries: muscleRag.map(({ exercise, muscles }) => ({
      exercise,
      muscles,
      tokens: tokenizeExercise(exercise),
      normalized: normalizeExerciseName(exercise),
    })),
    musclesList: Array.from(
      new Set(muscleRag.flatMap((entry) => entry.muscles))
    ).sort(),
  };
  return ragCache;
};

const buildRagCandidates = (exerciseName, entries) => {
  const tokens = tokenizeExercise(exerciseName);
  const normalized = normalizeExerciseName(exerciseName);
  return entries
    .map((entry) => ({
      ...entry,
      score: Math.max(
        jaccardSimilarity(tokens, entry.tokens),
        normalized.includes(entry.normalized) || entry.normalized.includes(normalized)
          ? 0.5
          : 0
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

const parseModelResponse = (text) => {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { exerciseName } = req.body || {};
    if (!exerciseName) {
      return res.status(400).json({ error: "Missing exerciseName" });
    }

    const { entries, musclesList } = await loadMuscleRag();
    const candidates = buildRagCandidates(exerciseName, entries);
    const prompt = `Tu es un coach sportif. Ta tâche: associer un exercice à 1-3 muscles.

Exercice: "${exerciseName}"

Muscles autorisés: ${musclesList.join(", ")}

Exemples RAG proches:
${candidates
  .map((entry) => `- ${entry.exercise} -> ${entry.muscles.join(", ")}`)
  .join("\n")}

Réponds uniquement en JSON strict, sans texte additionnel:
{"muscles":["muscle1","muscle2"],"confidence":0.0}
`;

    const model = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
    const headers = { "Content-Type": "application/json" };
    if (process.env.HF_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.HF_API_TOKEN}`;
    }

    const hfResponse = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 120,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!hfResponse.ok) {
      const ragFallback = candidates[0]?.muscles || [];
      return res.status(200).json({
        muscles: ragFallback,
        source: "rag",
      });
    }

    const result = await hfResponse.json();
    const text =
      Array.isArray(result) && result[0]?.generated_text
        ? result[0].generated_text
        : result?.generated_text || "";
    const parsed = parseModelResponse(text) || {};
    const muscles = Array.isArray(parsed.muscles) ? parsed.muscles : [];
    if (!muscles.length) {
      const ragFallback = candidates[0]?.muscles || [];
      return res.status(200).json({
        muscles: ragFallback,
        source: "rag",
      });
    }

    return res.status(200).json({
      muscles,
      confidence: parsed.confidence ?? null,
      source: "ai",
    });
  } catch (error) {
    console.error("Muscle categorize error:", error);
    return res.status(500).json({ error: "Failed to categorize exercise" });
  }
}
