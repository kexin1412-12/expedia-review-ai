"use client";

import { useState, useEffect } from "react";
import { Mic, Send, RotateCcw } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { isSpeechRecognitionSupported } from "@/lib/language-utils";

export default function VoiceInputDemo() {
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    setVoiceSupported(isSpeechRecognitionSupported());
  }, []);

  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    language: "en-US",
    onTranscript: (text) => console.log("Transcript:", text),
  });

  const [submittedText, setSubmittedText] = useState("");

  const handleSubmit = () => {
    if (transcript) {
      setSubmittedText(transcript);
      resetTranscript();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">🎤 Voice Input Demo</h1>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Browser Support: <strong>{voiceSupported ? "✅ Yes" : "❌ No"}</strong>
            </p>
            {voiceSupported ? (
              <p className="text-sm text-green-600">
                Your browser supports Web Speech API!
              </p>
            ) : (
              <p className="text-sm text-red-600">
                Web Speech API not supported in this browser. Try Chrome, Edge, or Safari.
              </p>
            )}
          </div>

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
              Status
            </p>
            <p className="text-sm font-mono text-blue-900">
              {isListening ? "🔴 Listening..." : "⚪ Idle"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-red-600 mb-1">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-green-600 uppercase mb-2">
                Current Transcript
              </p>
              <p className="text-sm text-gray-800 italic">
                "{transcript}"
              </p>
            </div>
          )}

          {/* Submitted */}
          {submittedText && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">
                Submitted
              </p>
              <p className="text-sm text-gray-800 italic">
                "{submittedText}"
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="space-y-2">
            {!isListening ? (
              <button
                onClick={startListening}
                disabled={!voiceSupported}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic size={20} />
                <span>Start Listening</span>
              </button>
            ) : (
              <>
                <button
                  onClick={stopListening}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 animate-pulse"
                >
                  <Mic size={20} />
                  <span>Stop Listening</span>
                </button>
                {transcript && (
                  <button
                    onClick={handleSubmit}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Send size={20} />
                    <span>Submit</span>
                  </button>
                )}
              </>
            )}

            {(transcript || submittedText) && (
              <button
                onClick={() => {
                  resetTranscript();
                  setSubmittedText("");
                }}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
            <p className="font-semibold">How to use:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "Start Listening"</li>
              <li>Speak clearly into your microphone</li>
              <li>Your speech will be transcribed in real-time</li>
              <li>Click "Submit" when done</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
