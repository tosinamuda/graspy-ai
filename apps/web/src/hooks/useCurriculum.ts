'use client';

import { useState, useCallback } from 'react';
import {
  generateCurriculum,
  streamCurriculum,
  type CurriculumRequest,
  type CurriculumResponse,
} from '@/lib/curriculum-api';

interface UseCurriculumResult {
  data: CurriculumResponse | null;
  loading: boolean;
  error: string | null;
  generate: (request: CurriculumRequest) => Promise<void>;
  generateWithStream: (request: CurriculumRequest) => Promise<void>;
}

export function useCurriculum(): UseCurriculumResult {
  const [data, setData] = useState<CurriculumResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (request: CurriculumRequest) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await generateCurriculum(request);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateWithStream = useCallback(async (request: CurriculumRequest) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const stream = streamCurriculum(request);

      for await (const chunk of stream) {
        setData(chunk);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    generate,
    generateWithStream,
  };
}
