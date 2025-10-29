"use client";

import { useState, FormEvent, useEffect, useCallback, useRef } from "react";
import { get, set, del } from "idb-keyval";
import Image from "next/image";

// Accent color (update here once)
const ACCENT_HEX = "#0EA5E9"; // cyan-blue, replace with your brand color

// Interfaces
interface Slide {
  title: string;
  content: string[];
  image: string;
}
interface PresentationData {
  slides: Slide[];
}
interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface SimulatedStep {
  title: string;
  subtitle: string;
}

const SIMULATED_ACTIONS = [
  "Searching the web",
  "Reading website",
  "Analyzing context",
  "Synthesizing ideas",
  "Identifying examples",
  "Drafting outline",
  "Formatting structure",
  "Selecting visuals",
  "Refining details",
];

// Random helper
function pickRandom<T>(arr: T[], n = 2): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// Simulated steps generator
function generateSimulatedSteps(content: string): SimulatedStep[] {
  const count = 1 + Math.floor(Math.random() * 3);
  const steps = pickRandom(SIMULATED_ACTIONS, count);
  return steps.map((s) => ({
    title: s,
    subtitle:
      s === "Searching the web"
        ? `"${content.slice(0, 40)}..."`
        : s === "Reading website"
        ? "https://example.com/…"
        : "Processing...",
  }));
}

export default function Home() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slideData, setSlideData] = useState<PresentationData | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userName, setUserName] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [stepsMap, setStepsMap] = useState<Record<number, SimulatedStep[]>>({}); // persistent steps

  const stepsCacheRef = useRef<Record<number, SimulatedStep[]>>({});

  // Load session
  useEffect(() => {
    const load = async () => {
      try {
        const storedName = await get("userName");
        const storedChat = await get("chatHistory");
        const storedSlides = await get("slideData");
        const storedSteps = await get("stepsMap");

        if (storedName) setUserName(storedName);
        if (storedChat) setChatHistory(storedChat);
        if (storedSlides) setSlideData(storedSlides);
        if (storedSteps) {
          setStepsMap(storedSteps);
          stepsCacheRef.current = storedSteps;
        }
      } catch (err) {
        console.warn("Failed to load session:", err);
      } finally {
        setIsMounted(true);
      }
    };
    load();
  }, []);

  // Persist chat, slides, steps
  useEffect(() => {
    if (isMounted) set("chatHistory", chatHistory).catch(() => {});
  }, [chatHistory, isMounted]);
  useEffect(() => {
    if (isMounted) {
      if (slideData) set("slideData", slideData).catch(() => {});
      else del("slideData").catch(() => {});
    }
  }, [slideData, isMounted]);
  useEffect(() => {
    if (isMounted) set("stepsMap", stepsMap).catch(() => {});
  }, [stepsMap, isMounted]);

  // Handle send
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input.trim();
    setInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: userPrompt }]);

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, currentSlides: slideData }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || `Generation failed (${response.status})`);
      }

      const data: PresentationData = await response.json();

      const newMsg: ChatMessage = {
        role: "model",
        content: "Slides have been updated!",
      };

      const newIndex = chatHistory.length + 1;
      const newSteps = generateSimulatedSteps(newMsg.content);

      stepsCacheRef.current[newIndex] = newSteps;
      setStepsMap((prev) => ({ ...prev, [newIndex]: newSteps }));
      setSlideData(data);
      setChatHistory((prev) => [...prev, newMsg]);
    } catch (err: any) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        { role: "model", content: `Error: ${err?.message || "Unknown error"}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Download PPTX
  const handleDownload = async () => {
    if (!slideData || slideData.slides.length === 0) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/download-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: slideData.slides,
          presentationTitle: slideData.slides[0].title || "AI Presentation",
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "presentation.pptx";
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!confirm("Start new chat? This will clear slides and history.")) return;
    setChatHistory([]);
    setSlideData(null);
    setStepsMap({});
    await del("chatHistory");
    await del("slideData");
    await del("stepsMap");
  };

  // Copy as prompt
  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // Renderers
  const renderModelCard = useCallback(
    (msg: ChatMessage, idx: number) => {
      const steps = stepsCacheRef.current[idx] || stepsMap[idx] || generateSimulatedSteps(msg.content);
      if (!stepsCacheRef.current[idx]) {
        stepsCacheRef.current[idx] = steps;
        setStepsMap((prev) => ({ ...prev, [idx]: steps }));
      }

      return (
        <div key={`model-${idx}`} className="space-y-4">
          <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="rounded px-2 py-1 text-xs font-semibold"
                  style={{ color: ACCENT_HEX, backgroundColor: `${ACCENT_HEX}15` }}
                >
                  Thinking...
                </span>
                <h4 className="text-sm font-semibold text-gray-800">AI Thoughts</h4>
              </div>
              <button
                onClick={() => handleCopyPrompt(msg.content)}
                className="text-xs text-gray-500 hover:text-gray-700"
                title="Copy as prompt"
              >
                Copy
              </button>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed">{msg.content}</div>
          </div>

          <div className="mx-auto max-w-3xl space-y-3">
            {steps.map((s, ix) => (
              <div
                key={`step-${idx}-${ix}`}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 text-sm"
                    style={{ borderColor: ACCENT_HEX }}
                  >
                    🔎
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{s.title}</div>
                    <div className="text-xs text-gray-500">{s.subtitle}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold" style={{ color: ACCENT_HEX }}>
                  Done
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },
    [stepsMap]
  );

  const renderUserBubble = (msg: ChatMessage, idx: number) => (
    <div key={`user-${idx}`} className="flex justify-end">
      <div
        className="max-w-[70%] rounded-xl px-4 py-3 text-white shadow"
        style={{ backgroundColor: ACCENT_HEX }}
      >
        <div className="text-sm">{msg.content}</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100">
      {/* Left column (Chat) */}
      <div
        className={`relative flex ${
          isPreviewOpen ? "w-[40%]" : "flex-1"
        } flex-col bg-white transition-all duration-300 border-r border-gray-200`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Chat2Slides</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewChat}
              className="rounded p-2 text-gray-500 hover:bg-gray-50"
              title="New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {chatHistory.length === 0 && (
              <div className="mt-8 text-center text-gray-400">
                Start by describing your presentation topic.
              </div>
            )}
            {chatHistory.map((msg, idx) =>
              msg.role === "user" ? renderUserBubble(msg, idx) : renderModelCard(msg, idx)
            )}
            {isLoading && (
              <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-medium" style={{ color: ACCENT_HEX }}>
                  Thinking...
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  Working on your slides — gathering sources and structuring ideas.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-3xl flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Start with a topic — e.g. 'Explain AI in 5 slides'"
              className="flex-1 rounded-full border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 w-12 flex items-center justify-center rounded-full text-white"
              style={{ backgroundColor: ACCENT_HEX }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>Tip: Try “Create 3 slides about SpaceX”</span>
            <span>{userName ? `Hi, ${userName}` : ""}</span>
          </div>
        </form>
      </div>

      {/* Right column (Preview) */}
      <div className={`flex ${isPreviewOpen ? "w-[60%]" : "w-12"} flex-col bg-gray-50 transition-all duration-300`}>
        <div className="flex items-center justify-between border-b border-gray-200 p-4 bg-white">
          {isPreviewOpen && <h2 className="text-lg font-semibold text-gray-900">Presentation Preview</h2>}
          <div className="flex items-center gap-3">
            {isPreviewOpen && (
              <button
                onClick={handleDownload}
                className="rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: ACCENT_HEX }}
                disabled={!slideData || isLoading}
              >
                Download PPTX
              </button>
            )}
            <button
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="rounded p-2 text-gray-500 hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d={isPreviewOpen ? "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" : "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"} />
              </svg>
            </button>
          </div>
        </div>

        {isPreviewOpen && (
          <div className="flex-1 overflow-y-auto p-8">
            {!slideData || slideData.slides.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400">
                <p className="text-lg">Your generated slides will appear here.</p>
              </div>
            ) : (
              <div className="mx-auto grid max-w-5xl gap-8">
                {slideData.slides.map((slide, index) => (
                  <div key={index} className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-white p-6 shadow">
                    <div className="absolute left-6 top-6 text-sm text-gray-400">{String(index + 1).padStart(2, "0")}</div>
                    <h3 className="mb-4 pt-8 text-2xl font-bold text-gray-900">{slide.title}</h3>
                    <div className="flex gap-6">
                      <ul className="list-disc space-y-2 pl-6 text-base text-gray-700 w-1/2">
                        {slide.content.map((p, pi) => (
                          <li key={pi}>{p}</li>
                        ))}
                      </ul>
                      {slide.image && (
                        <div className="w-1/2 relative overflow-hidden rounded-md">
                          <Image src={slide.image} alt={slide.title} layout="fill" objectFit="cover" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
