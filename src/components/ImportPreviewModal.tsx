import React from "react";
import { X, AlertTriangle, CheckCircle2, FileJson } from "lucide-react";
import { BackupImportValidationResult } from "../utils/backupImport";

interface ImportPreviewModalProps {
  result: BackupImportValidationResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ImportPreviewModal({ result, onConfirm, onCancel }: ImportPreviewModalProps) {
  const { preview, errors, warnings, valid } = result;
  if (!preview) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900">Импорт резервной копии</h3>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-1">
              {errors.map((e) => (
                <div key={e} className="flex gap-2 text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{e}</span>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1">
              {warnings.map((w) => (
                <div key={w} className="flex gap-2 text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {valid && (
            <>
              <p className="text-slate-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Будет восстановлено:
              </p>
              <ul className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <li>Сотрудников: {preview.employees}</li>
                <li>Визитов: {preview.visits}</li>
                <li>Солярий: {preview.solariumSessions}</li>
                <li>Сертификатов: {preview.giftCertificates}</li>
                <li>Долгов: {preview.debtRecords}</li>
                <li>Смен админов: {preview.adminShifts}</li>
              </ul>
              {preview.exportedAt && (
                <p className="text-[10px] text-slate-400">
                  Экспортировано: {new Date(preview.exportedAt).toLocaleString("ru-RU")}
                  {preview.appVersion ? ` · v${preview.appVersion}` : ""}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Отмена
          </button>
          {valid && (
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
            >
              Восстановить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
