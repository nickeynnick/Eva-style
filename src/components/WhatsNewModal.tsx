import React from "react";
import { X, Sparkles } from "lucide-react";
import { ChangelogEntry } from "../data/changelog";

interface WhatsNewModalProps {
  entry: ChangelogEntry;
  onDismiss: () => void;
}

export default function WhatsNewModal({ entry, onDismiss }: WhatsNewModalProps) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-rose-100 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                Что нового
              </div>
              <h2 className="text-lg font-bold">{entry.title}</h2>
            </div>
            <button type="button" onClick={onDismiss} className="p-1 text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {entry.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {section.heading}
              </h3>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="text-sm text-slate-700 flex gap-2 leading-snug">
                    <span className="text-rose-400 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
          >
            Понятно, начать работу
          </button>
        </div>
      </div>
    </div>
  );
}
