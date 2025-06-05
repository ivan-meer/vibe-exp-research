"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Mic,
  MicOff,
  Loader2,
  Brain,
  RefreshCw,
  Edit,
  BookOpen,
  Save,
  ArrowRight,
  Network,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

interface ResearchResult {
  id: string;
  model: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: Array<{
    url: string;
    title: string;
    snippet: string;
    source?: string;
    relevanceScore?: number;
    trustScore?: number;
    category?: string;
  }>;
  images?: Array<{
    url: string;
    alt?: string;
    title?: string;
  }>;
  knowledgeGraph?: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      relevance: number;
      category?: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight: number;
    }>;
    topics: string[];
  };
  related_questions?: string[];
  usage: {
    total_tokens: number;
  };
}

// Utility function to safely parse URLs
const getHostnameSafe = (urlString: string): string | null => {
  try {
    if (!urlString || typeof urlString !== "string") {
      return null;
    }
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return null;
  }
};

interface SourceCardProps {
  source: {
    url: string;
    title: string;
    snippet: string;
    relevanceScore?: number;
    trustScore?: number;
    category?: string;
  };
  onExplain: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, onExplain }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const trustScore = source.trustScore || 0.8;
  const relevanceScore = source.relevanceScore || 0.8;

  const trustColor =
    trustScore > 0.7
      ? "text-green-400"
      : trustScore > 0.4
        ? "text-yellow-400"
        : "text-red-400";

  const relevanceColor =
    relevanceScore > 0.8
      ? "text-cyan-400"
      : relevanceScore > 0.6
        ? "text-blue-400"
        : "text-purple-400";

  // Card border color based on relevance
  const cardBorderColor =
    relevanceScore > 0.8
      ? "border-green-400/60 hover:border-green-400/80 shadow-green-400/20"
      : relevanceScore > 0.6
        ? "border-yellow-400/60 hover:border-yellow-400/80 shadow-yellow-400/20"
        : "border-red-400/60 hover:border-red-400/80 shadow-red-400/20";

  // Card background glow based on relevance
  const cardGlow =
    relevanceScore > 0.8
      ? "shadow-lg shadow-green-400/10"
      : relevanceScore > 0.6
        ? "shadow-lg shadow-yellow-400/10"
        : "shadow-lg shadow-red-400/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative h-48 perspective-1000"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className={`relative w-full h-full transition-transform duration-600 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front of card */}
        <Card
          className={`absolute inset-0 glass-morphism ${cardBorderColor} ${cardGlow} transition-all duration-300 backface-hidden`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div
                className={`w-2 h-2 rounded-full ${trustColor} animate-pulse`}
              />
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-mono ${relevanceColor} font-bold`}
                >
                  {Math.round(relevanceScore * 100)}%
                </span>
                <span className="text-xs text-gray-500 uppercase">
                  {source.category || "web"}
                </span>
              </div>
            </div>
            <CardTitle className="text-sm text-white line-clamp-2">
              {source.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-300 line-clamp-3 mb-3">
              {source.snippet}
            </p>
            <Button
              size="sm"
              variant="outline"
              className={`w-full transition-all duration-300 ${
                relevanceScore > 0.8
                  ? "border-green-400/50 text-green-400 hover:bg-green-400/10"
                  : relevanceScore > 0.6
                    ? "border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
                    : "border-red-400/50 text-red-400 hover:bg-red-400/10"
              }`}
              onClick={onExplain}
            >
              <Brain className="w-3 h-3 mr-1" />
              Объяснить
            </Button>
          </CardContent>
        </Card>

        {/* Back of card */}
        <Card className="absolute inset-0 glass-morphism border-magenta-400/30 rotate-y-180 backface-hidden">
          <CardContent className="p-4 h-full flex flex-col justify-center">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Доверие:</span>
                <span className={trustColor}>
                  {(trustScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Релевантность:</span>
                <span className={relevanceColor}>
                  {(relevanceScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Источник:</span>
                <span className="text-white truncate ml-2">
                  {getHostnameSafe(source.url) || "Неверный URL"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

const ResearchScanner: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<
    "ready" | "thinking" | "fetching" | "synthesizing"
  >("ready");
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [phaseProgress, setPhaseProgress] = useState<{ [key: number]: number }>(
    {},
  );
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [currentThinkingStep, setCurrentThinkingStep] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("ru-RU");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const phases = [
    {
      name: "Начальное исследование",
      icon: "📡",
      description: "Perplexity: Поиск и анализ источников",
      service: "Perplexity",
      color: "cyan",
    },
    {
      name: "Глубокий анализ",
      icon: "🧠",
      description: "Gemini: Семантический анализ данных",
      service: "Gemini",
      color: "purple",
    },
    {
      name: "Классификация и тегирование",
      icon: "🏷️",
      description: "OpenAI: Структурирование знаний",
      service: "OpenAI GPT-4",
      color: "green",
    },
    {
      name: "Синтез и валидация",
      icon: "🔄",
      description: "Multi-AI: Кросс-валидация результатов",
      service: "Multi-AI",
      color: "orange",
    },
    {
      name: "Финальный отчет",
      icon: "📋",
      description: "Orchestrator: Генерация отчета",
      service: "Research Orchestrator",
      color: "blue",
    },
  ];

  const statusConfig = {
    ready: { color: "text-green-400", icon: "🟢", animation: "animate-pulse" },
    thinking: {
      color: "text-yellow-400",
      icon: "🟡",
      animation: "animate-spin",
    },
    fetching: {
      color: "text-blue-400",
      icon: "🔵",
      animation: "animate-bounce",
    },
    synthesizing: {
      color: "text-purple-400",
      icon: "🟣",
      animation: "neural-pulse",
    },
  };

  const detectLanguage = (text: string): string => {
    // Simple language detection based on character patterns
    const cyrillicPattern = /[а-яё]/i;
    const englishPattern = /[a-z]/i;

    const cyrillicCount = (text.match(cyrillicPattern) || []).length;
    const englishCount = (text.match(englishPattern) || []).length;

    if (cyrillicCount > englishCount) {
      return "ru-RU"; // Russian
    } else if (englishCount > 0) {
      return "en-US"; // English
    }
    return "ru-RU"; // Default to Russian
  };

  const handleVoiceToggle = () => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = detectedLanguage;

      if (!isListening) {
        setIsListening(true);
        setIsTranscribing(true);
        recognition.start();

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }

          // Detect language and update if needed
          const detectedLang = detectLanguage(transcript);
          if (detectedLang !== detectedLanguage) {
            setDetectedLanguage(detectedLang);
            recognition.lang = detectedLang;
          }

          setQuery(transcript);

          if (event.results[event.results.length - 1].isFinal) {
            setIsListening(false);
            setIsTranscribing(false);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
          setIsTranscribing(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setIsTranscribing(false);
        };
      } else {
        recognition.stop();
        setIsListening(false);
        setIsTranscribing(false);
      }
    }
  };

  const executeMultiStepResearch = async () => {
    setProgress(0);
    setCurrentPhase(0);
    setCompletedPhases([]);
    setPhaseProgress({});
    setThinkingSteps([]);
    setCurrentThinkingStep(0);
    setResults(null);

    const researchSteps = [
      {
        name: "Начальное исследование",
        service: "Perplexity",
        duration: 4000,
        thoughts: [
          "🔍 Анализирую запрос пользователя...",
          "📡 Сканирую доступные источники информации...",
          "🎯 Определяю ключевые темы для исследования...",
          "📊 Собираю первичные данные из надежных источников...",
          "🔗 Создаю базовую структуру знаний...",
        ],
      },
      {
        name: "Глубокий анализ",
        service: "Gemini",
        duration: 5000,
        thoughts: [
          "🧠 Получаю данные от Perplexity для анализа...",
          "🔬 Провожу семантический анализ содержимого...",
          "🕸️ Выявляю скрытые связи между концепциями...",
          "📈 Анализирую тренды и паттерны в данных...",
          "🎭 Определяю контекстуальные нюансы...",
          "🔄 Подготавливаю структурированные данные для OpenAI...",
        ],
      },
      {
        name: "Классификация и тегирование",
        service: "OpenAI GPT-4",
        duration: 4500,
        thoughts: [
          "🏷️ Получаю обработанные данные от Gemini...",
          "📋 Создаю систему классификации для информации...",
          "🎯 Генерирую релевантные теги для каждого концепта...",
          "📊 Структурирую данные по категориям важности...",
          "🔍 Выделяю ключевые инсайты и выводы...",
          "🌐 Создаю граф знаний с тегированными узлами...",
        ],
      },
      {
        name: "Синтез и валидация",
        service: "Multi-AI",
        duration: 6000,
        thoughts: [
          "🔄 Синтезирую данные от всех AI-сервисов...",
          "✅ Провожу кросс-валидацию фактов через Perplexity...",
          "🧬 Объединяю анализ от Gemini в единую структуру...",
          "🎯 Выявляю противоречия и устраняю неточности...",
          "📊 Создаю финальную оценку достоверности...",
          "🌟 Формирую ключевые инсайты и выводы...",
        ],
      },
      {
        name: "Финальный отчет",
        service: "Research Orchestrator",
        duration: 3000,
        thoughts: [
          "📋 Компилирую финальный исследовательский отчет...",
          "📊 Интегрирую все данные и анализ...",
          "🎨 Создаю визуализации и графы знаний...",
          "📈 Генерирую метрики качества исследования...",
          "✨ Финализирую презентацию результатов...",
          "🎯 Исследование завершено успешно!",
        ],
      },
    ];

    let allStepData: any[] = [];

    for (let stepIndex = 0; stepIndex < researchSteps.length; stepIndex++) {
      const step = researchSteps[stepIndex];
      setCurrentPhase(stepIndex);
      setStatus(
        stepIndex === 0
          ? "thinking"
          : stepIndex === 1
            ? "fetching"
            : stepIndex === 2
              ? "synthesizing"
              : "thinking",
      );

      // Add step thoughts gradually
      for (
        let thoughtIndex = 0;
        thoughtIndex < step.thoughts.length;
        thoughtIndex++
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, step.duration / step.thoughts.length),
        );

        setThinkingSteps((prev) => {
          const newSteps = [...prev];
          const stepPrefix = `[${step.service}] `;
          newSteps.push(stepPrefix + step.thoughts[thoughtIndex]);
          return newSteps;
        });
        setCurrentThinkingStep((prev) => prev + 1);

        // Update progress within step
        const stepProgress = ((thoughtIndex + 1) / step.thoughts.length) * 100;
        setPhaseProgress((prev) => ({
          ...prev,
          [stepIndex]: stepProgress,
        }));

        const overallProgress =
          ((stepIndex + (thoughtIndex + 1) / step.thoughts.length) /
            researchSteps.length) *
          100;
        setProgress(overallProgress);
      }

      // Call actual API for this step
      try {
        const { data, error } = await supabase.functions.invoke(
          "supabase-functions-perplexity-research",
          {
            body: {
              query,
              step: stepIndex,
              previousData: allStepData.length > 0 ? allStepData : null,
            },
          },
        );

        if (error) throw error;

        allStepData.push(data);

        // Add completion thoughts
        setThinkingSteps((prev) => [
          ...prev,
          `[${step.service}] ✅ ${step.name} завершен успешно!`,
          `[${step.service}] 📊 Данные переданы на следующий этап...`,
        ]);
        setCurrentThinkingStep((prev) => prev + 2);
      } catch (error) {
        console.error(`Error in step ${stepIndex}:`, error);
        setThinkingSteps((prev) => [
          ...prev,
          `[${step.service}] ❌ Ошибка на этапе ${step.name}`,
          `[${step.service}] 🔄 Переход к следующему этапу...`,
        ]);
      }

      setCompletedPhases((prev) => [...prev, stepIndex]);

      // Pause between steps for visualization
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Set final results
    if (allStepData.length > 0) {
      const finalStepData = allStepData[allStepData.length - 1];
      if (finalStepData && finalStepData.data) {
        setResults(finalStepData.data);
      }
    }

    setStatus("ready");
    setProgress(100);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    await executeMultiStepResearch();
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <TooltipProvider>
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h1 className="text-4xl font-bold text-glow bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              📡 ResearchScanner
            </h1>
            <p className="text-gray-400">Advanced AI Research Interface</p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="relative glass-morphism rounded-2xl p-6 border border-cyan-400/30 pulse-neon">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите ваш исследовательский запрос..."
                    className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-3 text-white placeholder-gray-400 text-lg"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVoiceToggle}
                  className={`${isListening ? "text-red-400 neon-glow" : "text-cyan-400"} hover:bg-cyan-400/10`}
                >
                  {isListening ? (
                    <div className="flex items-center space-x-1">
                      <MicOff className="w-5 h-5" />
                      {isTranscribing && (
                        <div className="flex space-x-1">
                          <div className="w-1 h-3 bg-red-400 animate-pulse" />
                          <div
                            className="w-1 h-2 bg-red-400 animate-pulse"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-1 h-4 bg-red-400 animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>

                <div
                  className={`flex items-center space-x-2 ${statusConfig[status].color}`}
                >
                  <span className={statusConfig[status].animation}>
                    {statusConfig[status].icon}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-mono uppercase">
                      {status}
                    </span>
                    {detectedLanguage && (
                      <span className="text-xs text-gray-400">
                        {detectedLanguage === "ru-RU" ? "Русский" : "English"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Thinking Process */}
          {isLoading && thinkingSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-morphism rounded-xl p-6 border border-cyan-400/30 mb-4"
            >
              <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>Процесс мышления ИИ</span>
              </h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {thinkingSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-500 ${
                      index === currentThinkingStep - 1
                        ? "bg-cyan-400/20 border border-cyan-400/50 shadow-lg shadow-cyan-400/20"
                        : index < currentThinkingStep - 1
                          ? "bg-green-400/10 border border-green-400/30 shadow-sm shadow-green-400/10"
                          : "bg-gray-800/30 border border-gray-600/30"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        index === currentThinkingStep - 1
                          ? "bg-cyan-400 animate-pulse"
                          : index < currentThinkingStep - 1
                            ? "bg-green-400"
                            : "bg-gray-600"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        index === currentThinkingStep - 1
                          ? "text-cyan-300"
                          : index < currentThinkingStep - 1
                            ? "text-green-300"
                            : "text-gray-500"
                      }`}
                    >
                      {step}
                    </span>

                    {/* Service indicator for thinking steps */}
                    {step.includes("[") && (
                      <div className="ml-auto">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            step.includes("Perplexity")
                              ? "bg-cyan-400/20 text-cyan-400"
                              : step.includes("Gemini")
                                ? "bg-purple-400/20 text-purple-400"
                                : step.includes("OpenAI")
                                  ? "bg-green-400/20 text-green-400"
                                  : step.includes("Multi-AI")
                                    ? "bg-orange-400/20 text-orange-400"
                                    : step.includes("Research Orchestrator")
                                      ? "bg-blue-400/20 text-blue-400"
                                      : "bg-gray-400/20 text-gray-400"
                          }`}
                        >
                          {step.match(/\[(.*?)\]/)?.[1] || "AI"}
                        </span>
                      </div>
                    )}
                    {index === currentThinkingStep - 1 && (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    )}
                    {index < currentThinkingStep - 1 && (
                      <span className="text-green-400">✓</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Progress Bar */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="glass-morphism rounded-xl p-6 border border-purple-400/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-purple-400">
                    Прогресс исследования
                  </h3>
                  <span className="text-sm text-gray-400">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="relative mb-6">
                  <Progress value={progress} className="h-3 bg-gray-800" />
                  <motion.div
                    className="absolute top-0 left-0 h-3 bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 rounded-full"
                    style={{ width: `${progress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute top-0 h-3 w-2 bg-white rounded-full shadow-lg"
                    style={{ left: `${Math.max(0, progress - 1)}%` }}
                    animate={{
                      boxShadow: [
                        "0 0 5px #00FFFF",
                        "0 0 20px #00FFFF, 0 0 30px #00FFFF",
                        "0 0 5px #00FFFF",
                      ],
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {phases.map((phase, index) => {
                    const isCompleted = completedPhases.includes(index);
                    const isActive = index === currentPhase && isLoading;
                    const phaseProgressValue = phaseProgress[index] || 0;

                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                              opacity: isCompleted ? 0.6 : isActive ? 1 : 0.4,
                              scale: isActive ? 1.05 : isCompleted ? 0.95 : 1,
                            }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className={`text-center p-3 rounded-lg transition-all duration-500 relative overflow-hidden ${
                              isCompleted
                                ? `bg-${phase.color}-400/20 border border-${phase.color}-400/50`
                                : isActive
                                  ? `bg-${phase.color}-400/20 border border-${phase.color}-400/50 neon-glow`
                                  : "bg-gray-800/50 border border-gray-600/50"
                            }`}
                          >
                            {/* Phase progress indicator */}
                            {isActive && (
                              <div
                                className={`absolute bottom-0 left-0 h-1 bg-${phase.color}-400 transition-all duration-300`}
                                style={{ width: `${phaseProgressValue}%` }}
                              />
                            )}

                            {/* Service indicator */}
                            <div className="absolute top-1 right-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isCompleted
                                    ? `bg-${phase.color}-400`
                                    : isActive
                                      ? `bg-${phase.color}-400 animate-pulse`
                                      : "bg-gray-600"
                                }`}
                              />
                            </div>

                            <motion.div
                              animate={{
                                rotate: isActive ? [0, 10, -10, 0] : 0,
                                scale: isActive
                                  ? [1, 1.1, 1]
                                  : isCompleted
                                    ? 0.9
                                    : 1,
                              }}
                              transition={{
                                duration: isActive ? 2 : 0.5,
                                repeat: isActive ? Infinity : 0,
                                ease: "easeInOut",
                              }}
                              className="text-2xl mb-2"
                            >
                              {isCompleted ? "✅" : phase.icon}
                            </motion.div>

                            <div
                              className={`text-xs transition-colors duration-300 mb-1 ${
                                isCompleted
                                  ? `text-${phase.color}-300`
                                  : isActive
                                    ? `text-${phase.color}-300`
                                    : "text-gray-400"
                              }`}
                            >
                              {phase.name}
                            </div>

                            <div
                              className={`text-xs opacity-70 ${
                                isCompleted
                                  ? `text-${phase.color}-400`
                                  : isActive
                                    ? `text-${phase.color}-400`
                                    : "text-gray-500"
                              }`}
                            >
                              {phase.service}
                            </div>

                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 border border-cyan-400/30 rounded-lg"
                              />
                            )}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-2">
                            <p className="font-semibold">{phase.name}</p>
                            <p className="text-sm">{phase.description}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span>Сервис:</span>
                              <span className={`text-${phase.color}-400`}>
                                {phase.service}
                              </span>
                            </div>
                            {isActive && (
                              <p
                                className={`text-xs text-${phase.color}-400 mt-1`}
                              >
                                В процессе: {Math.round(phaseProgressValue)}%
                              </p>
                            )}
                            {isCompleted && (
                              <p
                                className={`text-xs text-${phase.color}-400 mt-1`}
                              >
                                Завершено ✓
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Main Answer */}
              <Card className="glass-morphism border-cyan-400/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>Результаты исследования</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-200 leading-relaxed">
                      {results.choices[0]?.message.content}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Sources */}
              {results.citations && results.citations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-cyan-400 flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <span>Источники</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {results.citations.map((citation, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 30, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -30, scale: 0.9 }}
                          transition={{
                            duration: 0.6,
                            delay: index * 0.1,
                            ease: "easeOut",
                          }}
                        >
                          <SourceCard
                            source={citation}
                            onExplain={() => setShowChainOfThought(true)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Images Section */}
              {results.images && results.images.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-green-400 flex items-center space-x-2">
                    <ImageIcon className="w-5 h-5" />
                    <span>Related Images</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {results.images.map((image, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-morphism rounded-lg overflow-hidden border border-green-400/30 hover:border-green-400/60 transition-all duration-300"
                      >
                        <img
                          src={image.url}
                          alt={image.alt || `Research image ${index + 1}`}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80`;
                          }}
                        />
                        {image.title && (
                          <div className="p-2">
                            <p className="text-xs text-gray-300 truncate">
                              {image.title}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Knowledge Graph Section */}
              {results.knowledgeGraph && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-purple-400 flex items-center space-x-2">
                      <Network className="w-5 h-5" />
                      <span>Knowledge Graph</span>
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                      onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
                    >
                      {showKnowledgeGraph ? "Hide" : "Show"} Graph
                    </Button>
                  </div>

                  {showKnowledgeGraph && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="glass-morphism rounded-xl p-6 border border-purple-400/30"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nodes */}
                        <div>
                          <h4 className="text-lg font-semibold text-purple-300 mb-3">
                            Research Topics
                          </h4>
                          <div className="space-y-2">
                            {results.knowledgeGraph.nodes.map((node, index) => (
                              <motion.div
                                key={node.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`p-3 rounded-lg border transition-all duration-300 ${
                                  node.type === "query"
                                    ? "bg-purple-400/20 border-purple-400/50"
                                    : "bg-gray-800/50 border-gray-600/50 hover:border-purple-400/30"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-white truncate">
                                    {node.label}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-purple-400">
                                      {Math.round(node.relevance * 100)}%
                                    </span>
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        node.type === "query"
                                          ? "bg-purple-400"
                                          : "bg-cyan-400"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Related Topics */}
                        <div>
                          <h4 className="text-lg font-semibold text-cyan-300 mb-3">
                            Related Questions
                          </h4>
                          <div className="space-y-2">
                            {results.knowledgeGraph.topics
                              .slice(0, 5)
                              .map((topic, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="p-3 rounded-lg bg-cyan-400/10 border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer"
                                  onClick={() => setQuery(topic)}
                                >
                                  <span className="text-sm text-cyan-300">
                                    {topic}
                                  </span>
                                </motion.div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Research Report Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-yellow-400 flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Research Report</span>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
                    onClick={() => setShowReport(!showReport)}
                  >
                    {showReport ? "Hide" : "Generate"} Report
                  </Button>
                </div>

                {showReport && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-morphism rounded-xl p-8 border border-yellow-400/30"
                  >
                    <div className="space-y-6">
                      {/* Report Header */}
                      <div className="text-center border-b border-gray-700 pb-6">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-2">
                          Research Report
                        </h2>
                        <p className="text-gray-400">Query: {query}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Generated on {new Date().toLocaleDateString()} •{" "}
                          {results.citations?.length || 0} sources analyzed
                        </p>
                      </div>

                      {/* Executive Summary */}
                      <div>
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>Executive Summary</span>
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-400/20">
                          <p className="text-gray-200 leading-relaxed">
                            {results.choices[0]?.message.content
                              .split(".")
                              .slice(0, 3)
                              .join(".") + "."}
                          </p>
                        </div>
                      </div>

                      {/* Key Findings */}
                      <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center space-x-2">
                          <Zap className="w-4 h-4" />
                          <span>Key Findings</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {results.citations
                            ?.slice(0, 4)
                            .map((citation, index) => (
                              <div
                                key={index}
                                className="bg-gray-800/50 rounded-lg p-4 border border-green-400/20"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold text-green-400">
                                    Finding #{index + 1}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {Math.round(
                                      (citation.relevanceScore || 0.8) * 100,
                                    )}
                                    % relevant
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300 mb-2">
                                  {citation.snippet}
                                </p>
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                  {citation.title}
                                </a>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Detailed Analysis */}
                      <div>
                        <h3 className="text-lg font-semibold text-purple-400 mb-3">
                          Detailed Analysis
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-400/20">
                          <p className="text-gray-200 leading-relaxed">
                            {results.choices[0]?.message.content}
                          </p>
                        </div>
                      </div>

                      {/* Source Quality Analysis */}
                      <div>
                        <h3 className="text-lg font-semibold text-orange-400 mb-3">
                          Source Quality Analysis
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-orange-400/20">
                            <div className="text-2xl font-bold text-green-400">
                              {results.citations?.filter(
                                (c) => (c.trustScore || 0) > 0.7,
                              ).length || 0}
                            </div>
                            <div className="text-sm text-gray-400">
                              High Trust Sources
                            </div>
                          </div>
                          <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-orange-400/20">
                            <div className="text-2xl font-bold text-cyan-400">
                              {Math.round(
                                ((results.citations?.reduce(
                                  (acc, c) => acc + (c.relevanceScore || 0),
                                  0,
                                ) || 0) /
                                  (results.citations?.length || 1)) *
                                  100,
                              )}
                              %
                            </div>
                            <div className="text-sm text-gray-400">
                              Avg. Relevance
                            </div>
                          </div>
                          <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-orange-400/20">
                            <div className="text-2xl font-bold text-purple-400">
                              {results.usage?.total_tokens || 0}
                            </div>
                            <div className="text-sm text-gray-400">
                              Tokens Used
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  variant="outline"
                  className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                  onClick={handleSearch}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>

                <Button
                  variant="outline"
                  className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10"
                  onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
                >
                  <Network className="w-4 h-4 mr-2" />
                  Knowledge Graph
                </Button>

                <Button
                  variant="outline"
                  className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
                  onClick={() => setShowReport(!showReport)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Full Report
                </Button>

                <Button
                  variant="outline"
                  className="border-green-400/50 text-green-400 hover:bg-green-400/10"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Research
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default ResearchScanner;
