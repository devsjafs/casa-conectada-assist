import { useState, useEffect, useCallback } from 'react';

type ExtractorPipeline = any;

// Singleton: load model once across the entire app
let extractorPromise: Promise<ExtractorPipeline> | null = null;

async function loadExtractor(): Promise<ExtractorPipeline> {
  if (extractorPromise) return extractorPromise;

  extractorPromise = (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    console.log('[FaceRecognition] Loading ViT model...');
    const extractor = await pipeline(
      'image-feature-extraction',
      'Xenova/vit-base-patch16-224',
    );
    console.log('[FaceRecognition] Model loaded successfully');
    return extractor;
  })();

  return extractorPromise;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function normalizeVector(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return mag > 0 ? vec.map(v => v / mag) : vec;
}

interface MemberWithEmbedding {
  id: string;
  face_embedding: number[] | null;
}

export function useFaceRecognition() {
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    loadExtractor()
      .then(() => {
        setModelReady(true);
        setModelLoading(false);
      })
      .catch((err) => {
        console.error('[FaceRecognition] Model load error:', err);
        setModelError('Falha ao carregar o modelo de reconhecimento');
        setModelLoading(false);
      });
  }, []);

  const computeEmbedding = useCallback(async (imageSource: string): Promise<number[] | null> => {
    try {
      const extractor = await loadExtractor();
      const result = await extractor(imageSource, { pooling: 'mean', normalize: true });

      // result is a Tensor; .data is a TypedArray
      const tensor = Array.isArray(result) ? result[0] : result;
      let data: number[];

      if (tensor?.data) {
        data = Array.from(tensor.data as Float32Array);
      } else if (tensor?.tolist) {
        const list = tensor.tolist();
        data = Array.isArray(list[0]) ? list[0] : list;
      } else {
        console.warn('[FaceRecognition] Unexpected result shape');
        return null;
      }

      // Always normalize
      return normalizeVector(data);
    } catch (err) {
      console.error('[FaceRecognition] Embedding error:', err);
      return null;
    }
  }, []);

  const findBestMatch = useCallback((
    embedding: number[],
    members: MemberWithEmbedding[],
    threshold = 0.75,
  ): { memberId: string; similarity: number } | null => {
    let best: { memberId: string; similarity: number } | null = null;

    for (const member of members) {
      if (!member.face_embedding || !Array.isArray(member.face_embedding) || member.face_embedding.length === 0) {
        continue;
      }
      const sim = cosineSimilarity(embedding, member.face_embedding);

      if (sim >= threshold && (!best || sim > best.similarity)) {
        best = { memberId: member.id, similarity: sim };
      }
    }

    return best;
  }, []);

  return { modelReady, modelLoading, modelError, computeEmbedding, findBestMatch };
}
