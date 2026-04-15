/**
 * Hook for Web Speech API voice input
 */

import { useRef, useState, useCallback } from "react";
import {
  isSpeechRecognitionSupported,
  getSpeechRecognitionConstructor,
} from "@/lib/language-utils";

export interface UseVoiceInputParams {
  language: string; // e.g., 'en-US', 'zh-CN'
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

export function useVoiceInput(params: UseVoiceInputParams): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupportedRef = useRef(isSpeechRecognitionSupported());

  const startListening = useCallback(() => {
    if (!isSupportedRef.current) {
      const err = "Speech Recognition is not supported in this browser";
      setError(err);
      params.onError?.(err);
      return;
    }

    try {
      const SpeechRecognition = getSpeechRecognitionConstructor();
      if (!SpeechRecognition) {
        throw new Error("SpeechRecognition constructor not available");
      }

      const recognition = new SpeechRecognition();
      recognition.lang = params.language;
      recognition.continuous = false;
      recognition.interimResults = true;

      let fullTranscript = "";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        params.onListeningChange?.(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            fullTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = fullTranscript + interimTranscript;
        setTranscript(currentTranscript);
        params.onTranscript(currentTranscript);
      };

      recognition.onend = () => {
        setIsListening(false);
        params.onListeningChange?.(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMsg = `Speech recognition error: ${event.error}`;
        setError(errorMsg);
        setIsListening(false);
        params.onError?.(errorMsg);
        params.onListeningChange?.(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      params.onError?.(errorMsg);
    }
  }, [params]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      params.onListeningChange?.(false);
    }
  }, [params]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: isSupportedRef.current,
  };
}
