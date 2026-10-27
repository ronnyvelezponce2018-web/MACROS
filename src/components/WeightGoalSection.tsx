import React, { useState } from 'react';
import { Check, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  BaselineActivity,
  BiologicalSex,
  ComputedDailySummary,
  GoalPace,
  UserNutritionProfile,
  WeightLogEntry,
} from '../types/nutrition';
import { formatSpanishDate } from '../utils/calculations';

interface WeightGoalSectionProps {
  profile: UserNutritionProfile;
  summary: ComputedDailySummary;
  weightLogs: WeightLogEntry[];
  selectedDate: string;
  onUpdateProfile: (next: UserNutritionProfile) => void;
  onAddWeightLog: (weightKg: number, date: string, note?: string) => void;
  onDeleteWeightLog: (id: string) => void;
}

export function WeightGoalSection({
  profile,
  summary,
  weightLogs,
  selectedDate,
  onUpdateProfile,
  onAddWeightLog,
  onDeleteWeightLog,
}: WeightGoalSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [logNote, setLogNote] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleWeightChange = (
    field: 'currentWeightKg' | 'targetWeightKg',
    raw: string
  ) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    onUpdateProfile({
      ...profile,
      [field]: Math.max(25, Math.min(350, parsed)),
    });
  };

  const handleRecordCurrentWeight = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWeightLog(
      profile.currentWeightKg,
      selectedDate,
      logNote.trim() || undefined
    );
    setLogNote('');
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 1800);
  };

  const totalDistance = Math.abs(
    profile.targetWeightKg - profile.initialWeightKg
  );
  const remainingDistance = Math.abs(
    profile.targetWeightKg - profile.currentWeightKg
  );
  let progressPct = 100;

  if (totalDistance > 0.1) {
    const movingRightWay =
      (profile.targetWeightKg < profile.initialWeightKg &&
        profile.currentWeightKg <= profile.initialWeightKg) ||
      (profile.targetWeightKg > profile.initialWeightKg &&
        profile.currentWeightKg >= profile.initialWeightKg);

    if (!movingRightWay) {
      progressPct = 0;
    } else {
      const covered = Math.abs(
        profile.currentWeightKg - profile.initialWeightKg
      );
      progressPct = Math.min(100, Math.round((covered / totalDistance) * 100));
    }
  } else if (remainingDistance > 0.2) {
    progressPct = 0;
  }

  const diffFromGoal =
    Math.round((profile.targetWeightKg - profile.currentWeightKg) * 10) / 10;

  const sortedLogs = [...weightLogs].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const recentLogs = sortedLogs.slice(-10);

  const allWeightsForScale = [
    ...recentLogs.map((l) => l.weightKg),
    profile.currentWeightKg,
    profile.targetWeightKg,
  ];
  const minW = Math.min(...allWeightsForScale) - 1.5;
  const maxW = Math.max(...allWeightsForScale) + 1.5;
  const rangeW = Math.max(2, maxW - minW);

  const svgWidth = 520;
  const svgHeight = 140;
  const padX = 24;
  const padY = 20;

  const getY = (w: number) =>
    svgHeight - padY - ((w - minW) / rangeW) * (svgHeight - padY * 2);
  const getX = (idx: number, count: number) =>
    count <= 1
      ? svgWidth / 2
      : padX + (idx / (count - 1)) * (svgWidth - padX * 2);

  const targetLineY = getY(profile.targetWeightKg);

  return (
    <section
      id="peso"
      aria-labelledby="peso-heading"
      className="bg-[#111A2E] border border-slate-800 rounded-xl overflow-hidden"
    >
      <div className="p-6 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-sky-400 font-medium">
            Control antropométrico · Cálculo automático de calorías y macros
          </p>
          <h2
            id="peso-heading"
            className="mt-1 text-xl font-bold tracking-tight text-white"
          >
            Peso Corporal y Meta Nutricional
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {showAdvanced
              ? 'Ocultar parámetros metabólicos'
              : 'Ajustar perfil metabólico'}
          </span>
        </button>
      </div>

      {/* Controles principales de Peso Actual y Peso Objetivo */}
      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="current-weight-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Tu peso actual (kg)
              </label>
              <div className="relative">
                <input
                  id="current-weight-input"
                  type="number"
                  step="0.1"
                  min="25"
                  max="350"
                  value={profile.currentWeightKg}
                  onChange={(e) =>
                    handleWeightChange('currentWeightKg', e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 pr-12 text-lg font-mono font-bold text-white bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="target-weight-input"
                className="block text-xs font-semibold text-emerald-400 mb-1.5"
              >
                Tu peso objetivo (kg)
              </label>
              <div className="relative">
                <input
                  id="target-weight-input"
                  type="number"
                  step="0.1"
                  min="25"
                  max="350"
                  value={profile.targetWeightKg}
                  onChange={(e) =>
                    handleWeightChange('targetWeightKg', e.target.value)
                  }
                  className="w-full px-3.5 py-2.5 pr-12 text-lg font-mono font-bold text-emerald-400 bg-[#0B1120] border border-emerald-500/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 tabular-nums"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400/80">
                  kg
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progreso hacia el peso objetivo */}
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
              <span>Inicial: {profile.initialWeightKg.toFixed(1)} kg</span>
              <span className="font-sans font-bold text-lime-300">
                {Math.abs(diffFromGoal) <= 0.2
                  ? 'En tu peso objetivo'
                  : diffFromGoal < 0
                    ? `Por bajar: ${Math.abs(diffFromGoal).toFixed(1)} kg`
                    : `Por subir: +${diffFromGoal.toFixed(1)} kg`}
              </span>
              <span className="text-emerald-400">
                Meta: {profile.targetWeightKg.toFixed(1)} kg
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-emerald-400 to-lime-400 transition-transform duration-200 origin-left"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                TMB estimada:{' '}
                <strong className="font-mono text-slate-200 tabular-nums">
                  {summary.bmrCalories} kcal
                </strong>{' '}
                · Gasto base:{' '}
                <strong className="font-mono text-slate-200 tabular-nums">
                  {summary.tdeeBaseCalories} kcal
                </strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateProfile({
                    ...profile,
                    initialWeightKg: profile.currentWeightKg,
                  })
                }
                className="text-sky-400 hover:text-sky-300 hover:underline font-medium whitespace-nowrap cursor-pointer"
              >
                Fijar actual como inicial
              </button>
            </div>
          </div>

          {/* Guardar pesaje en historial */}
          <form
            onSubmit={handleRecordCurrentWeight}
            className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="Nota opcional del pesaje (ej. en ayunas)"
              className="flex-1 px-3 py-2 text-sm text-white placeholder:text-slate-500 bg-[#0B1120] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Pesaje guardado</span>
                </>
              ) : (
                <span>
                  Guardar pesaje ({profile.currentWeightKg.toFixed(1)} kg)
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Gráfica de evolución e historial reciente */}
        <div className="lg:col-span-6 lg:border-l lg:border-slate-800 lg:pl-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Evolución hacia tu Peso Objetivo
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {sortedLogs.length}{' '}
              {sortedLogs.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="w-full bg-[#0B1120] border border-slate-800 rounded-lg p-3">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-32 overflow-visible"
              role="img"
              aria-label="Gráfica de evolución de peso corporal frente al peso objetivo"
            >
              {/* Línea punteada de Peso Objetivo */}
              <line
                x1={padX}
                y1={targetLineY}
                x2={svgWidth - padX}
                y2={targetLineY}
                stroke="#34d399"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={svgWidth - padX}
                y={Math.max(12, targetLineY - 6)}
                textAnchor="end"
                className="fill-emerald-400 text-[10px] font-mono"
              >
                Meta: {profile.targetWeightKg.toFixed(1)} kg
              </text>

              {/* Polilínea de pesajes */}
              {recentLogs.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  points={recentLogs
                    .map(
                      (entry, idx) =>
                        `${getX(idx, recentLogs.length)},${getY(entry.weightKg)}`
                    )
                    .join(' ')}
                />
              )}

              {/* Puntos de pesaje */}
              {recentLogs.map((entry, idx) => {
                const cx = getX(idx, recentLogs.length);
                const cy = getY(entry.weightKg);
                return (
                  <g key={entry.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="4.5"
                      className="fill-[#0B1120] stroke-sky-400"
                      strokeWidth="2.5"
                    />
                    <text
                      x={cx}
                      y={cy - 9}
                      textAnchor="middle"
                      className="fill-slate-200 text-[10px] font-mono"
                    >
                      {entry.weightKg.toFixed(1)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {recentLogs.length > 0 && (
            <div className="max-h-32 overflow-y-auto divide-y divide-slate-800/80 border-t border-slate-800">
              {[...recentLogs]
                .reverse()
                .slice(0, 4)
                .map((item) => (
                  <div
                    key={item.id}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatSpanishDate(item.date)}
                      </span>
                      {item.note && (
                        <>
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="truncate">{item.note}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-bold text-sky-400 tabular-nums">
                        {item.weightKg.toFixed(1)} kg
                      </span>
                      {sortedLogs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteWeightLog(item.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          aria-label={`Eliminar pesaje del ${item.date}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel desplegable de configuración metabólica y ajuste por ejercicio */}
      {showAdvanced && (
        <div className="px-6 py-6 sm:px-8 bg-[#0D1526] border-t border-slate-800 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Altura (cm)
              </label>
              <input
                type="number"
                min="120"
                max="230"
                value={profile.heightCm}
                onChange={(e) =>
                  onUpdateProfile({
                    ...profile,
                    heightCm: Number(e.target.value) || 170,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono text-white bg-[#111A2E] border border-slate-700 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Edad (años)
              </label>
              <input
                type="number"
                min="14"
                max="100"
                value={profile.age}
                onChange={(e) =>
                  onUpdateProfile({
                    ...profile,
                    age: Number(e.target.value) || 30,
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono text-white bg-[#111A2E] border border-slate-700 rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Sexo biológico (fórmula TMB)
              </label>
              <select
                value={profile.sex}
                onChange={(e) =>
                  onUpdateProfile({
                    ...profile,
                    sex: e.target.value as BiologicalSex,
                  })
                }
                className="w-full px-3 py-2 text-sm text-white bg-[#111A2E] border border-slate-700 rounded-lg"
              >
                <option value={BiologicalSex.MASCULINO}>Masculino</option>
                <option value={BiologicalSex.FEMENINO}>Femenino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Actividad diaria sin ejercicio
              </label>
              <select
                value={profile.baselineActivity}
                onChange={(e) =>
                  onUpdateProfile({
                    ...profile,
                    baselineActivity: e.target.value as BaselineActivity,
                  })
                }
                className="w-full px-3 py-2 text-sm text-white bg-[#111A2E] border border-slate-700 rounded-lg"
              >
                <option value={BaselineActivity.SEDENTARIO}>
                  Sedentario (oficina)
                </option>
                <option value={BaselineActivity.LIGERO}>
                  Ligero (de pie ocasional)
                </option>
                <option value={BaselineActivity.ACTIVO}>
                  Activo (trabajo físico)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ritmo hacia peso objetivo
              </label>
              <select
                value={profile.goalPace}
                onChange={(e) =>
                  onUpdateProfile({
                    ...profile,
                    goalPace: e.target.value as GoalPace,
                  })
                }
                className="w-full px-3 py-2 text-sm text-white bg-[#111A2E] border border-slate-700 rounded-lg"
              >
                <option value={GoalPace.SUAVE}>Suave (±250 kcal)</option>
                <option value={GoalPace.ESTANDAR}>Estándar (±450 kcal)</option>
                <option value={GoalPace.INTENSIVO}>Intensivo (±650 kcal)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-white">
                Ajuste de ingesta calórica recomendada según actividad física
              </p>
              <p className="text-xs text-slate-400">
                Define qué porcentaje de las calorías quemadas en ejercicio se suma automáticamente a tu meta diaria.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start">
              {[
                { label: '100% (Total)', value: 1 },
                { label: '75% (Moderado)', value: 0.75 },
                { label: '50% (Conservador)', value: 0.5 },
                { label: '0% (Fijo)', value: 0 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      exerciseCalorieAdjustmentRatio: opt.value,
                    })
                  }
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    profile.exerciseCalorieAdjustmentRatio === opt.value
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opción de metas manuales personalizadas */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.useManualTargets}
                onChange={(e) =>
                  onUpdateProfile({
                    ...profile,
                    useManualTargets: e.target.checked,
                  })
                }
                className="rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
              />
              <span>Definir mis calorías y macronutrientes base manualmente</span>
            </label>

            {profile.useManualTargets && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-emerald-400 mb-1">
                    Calorías base (kcal)
                  </label>
                  <input
                    type="number"
                    min="800"
                    max="6000"
                    value={profile.manualBaseCalories}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...profile,
                        manualBaseCalories: Number(e.target.value) || 2000,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono text-white bg-[#111A2E] border border-slate-700 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-orange-400 mb-1">
                    Carbohidratos base (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="800"
                    value={profile.manualCarbsGrams}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...profile,
                        manualCarbsGrams: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono text-white bg-[#111A2E] border border-slate-700 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-sky-400 mb-1">
                    Proteínas base (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={profile.manualProteinGrams}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...profile,
                        manualProteinGrams: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono text-white bg-[#111A2E] border border-slate-700 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-400 mb-1">
                    Grasas base (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={profile.manualFatGrams}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...profile,
                        manualFatGrams: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono text-white bg-[#111A2E] border border-slate-700 rounded-lg tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
