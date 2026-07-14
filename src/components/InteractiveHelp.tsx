import React, { useState } from "react";
import {
  HelpCircle,
  Search,
  BookOpen,
  Calculator,
  DollarSign,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sun,
  Users,
  ShieldCheck,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { faqs, HELP_CATEGORIES, CATEGORY_LABELS, HelpCategory } from "../data/helpContent";
import { APP_CHANGELOG } from "../data/changelog";
import { APP_VERSION } from "../data/appVersion";

const CATEGORY_ICONS: Record<HelpCategory | "all", React.ComponentType<{ className?: string }>> = {
  all: BookOpen,
  general: LayoutGrid,
  accounting: Calendar,
  calculator: Calculator,
  solarium: Sun,
  salaries: DollarSign,
  admin: Users,
  owner: Briefcase,
  security: ShieldCheck,
};

export default function InteractiveHelp() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      (faq.keywords && faq.keywords.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const categoryTitle =
    activeCategory === "all"
      ? "Полный справочник программы"
      : CATEGORY_LABELS[activeCategory as HelpCategory];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans" id="interactive-help-root">
      <div
        className="bg-gradient-to-r from-rose-50 to-indigo-50 p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        id="help-hero"
      >
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 flex items-center justify-center md:justify-start gap-2.5">
            <HelpCircle className="h-6 w-6 text-rose-500" />
            Справочный центр «Ева-стиль»
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-medium leading-relaxed">
            Полное руководство по всем вкладкам, действиям и сценариям работы: учёт визитов, касса, солярий,
            зарплаты, табель, калькулятор, кабинет владелицы и безопасность. {faqs.length} статей с описанием
            принципов расчёта.
          </p>
        </div>

        <div className="relative w-full md:w-96 shadow-xs rounded-xl overflow-hidden">
          <input
            type="text"
            placeholder="Поиск по справке (визит, касса, пароль…)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setExpandedFaqIndex(null);
            }}
            className="w-full bg-white text-slate-800 pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400 border border-slate-200 rounded-xl"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {APP_CHANGELOG[0] && (
        <div
          className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3"
          id="help-whats-new"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Что нового · версия {APP_VERSION}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Тот же список, что в окне при обновлении. Полная история — в CHANGELOG проекта.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {APP_CHANGELOG[0].sections.map((section) => (
              <div key={section.heading} className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.heading}
                </h4>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item} className="text-xs text-slate-700 flex gap-2 leading-snug">
                      <span className="text-rose-400 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="help-grid-container">
        <div className="lg:col-span-3 space-y-2" id="help-navigation-sidebar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-3">
            Разделы справки
          </span>
          <div className="bg-white p-2.5 rounded-2xl border border-slate-150 shadow-xs space-y-1 max-h-[70vh] overflow-y-auto">
            {HELP_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id];
              const count =
                cat.id === "all" ? faqs.length : faqs.filter((f) => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setExpandedFaqIndex(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                    activeCategory === cat.id
                      ? "bg-rose-50 text-rose-700 border border-rose-200/50"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${activeCategory === cat.id ? "text-rose-600" : "text-slate-400"}`}
                    />
                    <span className="truncate">{cat.label}</span>
                  </span>
                  <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6" id="help-content-area">
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4" id="faqs-accordion-box">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Справочник</span>
                <h3 className="text-md sm:text-lg font-extrabold text-slate-800">{categoryTitle}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Найдено статей: {filteredFaqs.length}
                  {searchQuery && ` по запросу «${searchQuery}»`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedFaqIndex(-1)}
                  className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                >
                  Развернуть все
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedFaqIndex(null)}
                  className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                >
                  Свернуть
                </button>
              </div>
            </div>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                По запросу «{searchQuery}» ничего не найдено. Попробуйте: «визит», «касса», «пароль», «солярий».
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFaqs.map((faq, index) => {
                  const isExpanded = expandedFaqIndex === index || expandedFaqIndex === -1;
                  return (
                    <div key={`${faq.category}-${index}`} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFaqIndex(isExpanded && expandedFaqIndex !== -1 ? null : index)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors text-xs sm:text-sm font-bold text-slate-700"
                      >
                        <span className="flex items-start gap-2.5 pr-4">
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                          {faq.question}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed space-y-3">
                          <p>{faq.answer}</p>
                          <div className="pt-1">
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                              {CATEGORY_LABELS[faq.category]}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

