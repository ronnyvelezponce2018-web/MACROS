import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import {
  ComputedDailySummary,
  ExerciseCatalogItem,
  ExerciseIntensity,
  LoggedExercise,
  UserNutritionProfile,
} from '../types/nutrition';
import { calculateExerciseCalories } from '../utils/calculations';

interface ActivityTrackerSectionProps {
  selectedDate: string;
  profile: UserNutritionProfile;
  summary: ComputedDailySummary;
  exerciseCatalog: ExerciseCatalogItem[];
  exercisesForDay: LoggedExercise[];
  onAddExercise: (exercise: Omit<LoggedExercise, 'id' | 'createdAt'>) => void;
  onDeleteExercise: (id: string) => void;
}

const INTENSITY_OPTIONS: {
  level: ExerciseIntensity;
  hint: string;
}[] = [
  { level: ExerciseIntensity.BAJA, hint: 'Esfuerzo suave, conversación fluida' },
  {
    level: ExerciseIntensity.MODERADA,
    hint: 'Ritmo sostenido, respiración activa',
  },
  { level: ExerciseIntensity.ALTA, hint: 'Esfuerzo vigoroso, pulsaciones altas' },
  {
    level: ExerciseIntensity.MUY_ALTA,
    hint: 'Máxima exigencia / intervalos intensos',
  },
];

export function ActivityTrackerSection({
  selectedDate,
  profile,
  summary,
  exerciseCatalog,
  exercisesForDay,
  onAddExercise,
  onDeleteExercise,
}: ActivityTrackerSectionProps) {
  const [mode, setMode] = useState<'catalogo' | 'personalizado'>('catalogo');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exerciseCatalog[0]?.id ?? ''
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [intensity, setIntensity] = useState<ExerciseIntensity>(
    ExerciseIntensity.MODERADA
  );

  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Entrenamiento general');
  const [useManualKcalOverride, setUseManualKcalOverride] = useState(false);
  const [manualKcalBurned, setManualKcalBurned] = useState<number>(300);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return exerciseCatalog;
    return exerciseCatalog.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.category.toLowerCase().includes(q)
    );
  }, [exerciseCatalog, searchQuery]);

  const activeExercise = useMemo(() => {
    return (
      exerciseCatalog.find((e) => e.id === selectedExerciseId) ||
      filteredExercises[0] ||
      exerciseCatalog[0]
    );
  }, [exerciseCatalog, filteredExercises, selectedExerciseId]);

  const customMetMap: Record<ExerciseIntensity, number> = {
    [ExerciseIntensity.BAJA]: 3.5,
    [ExerciseIntensity.MODERADA]: 5.8,
    [ExerciseIntensity.ALTA]: 8.2,
    [ExerciseIntensity.MUY_ALTA]: 10.5,
  };

  const currentMet =
    mode === 'catalogo' && activeExercise
      ? activeExercise.metsByIntensity[intensity]
      : customMetMap[intensity];

  const estimatedBurnedKcal = useMemo(() => {
    if (mode === 'personalizado' && useManualKcalOverride) {
      return Math.max(0, Math.round(manualKcalBurned));
    }
    return calculateExerciseCalories(
      currentMet,
      profile.currentWeightKg,
      durationMinutes
    );
  }, [
    mode,
    useManualKcalOverride,
    manualKcalBurned,
    currentMet,
    profile.currentWeightKg,
    durationMinutes,
  ]);

  const estimatedRecommendedIncrease = Math.round(
    estimatedBurnedKcal * profile.exerciseCalorieAdjustmentRatio
  );

  const selectedIntensityHint =
    INTENSITY_OPTIONS.find((i) => i.level === intensity)?.hint ?? '';

  const handleSubmitExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0) return;

    if (mode === 'catalogo') {
      if (!activeExercise) return;
      onAddExercise({
        date: selectedDate,
        exerciseId: activeExercise.id,
        name: activeExercise.name,
        category: activeExercise.category,
        durationMinutes: Math.round(durationMinutes),
        intensity,
        metUsed: currentMet,
        caloriesBurned: estimatedBurnedKcal,
        isManualCalories: false,
      });
    } else {
      const cleanName = customName.trim();
      if (!cleanName) return;
      onAddExercise({
        date: selectedDate,
        exerciseId: `custom-ex-${Date.now()}`,
        name: cleanName,
        category: customCategory,
        durationMinutes: Math.round(durationMinutes),
        intensity,
        metUsed: currentMet,
        caloriesBurned: estimatedBurnedKcal,
        isManualCalories: useManualKcalOverride,
      });
      setCustomName('');
    }
  };

  return (
    <section
      id="actividad"
      aria-labelledby="actividad-heading"
      className="bg-[#111A2E] border border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Cabecera */}
      <div className="p-6 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-orange-400 font-medium">
            Gasto energético por ejercicio (fórmula MET × peso actual) · Ajuste dinámico de meta calórica
          </p>
          <h2
            id="actividad-heading"
            className="mt-1 text-xl font-bold tracking-tight text-white"
          >
            Seguimiento de Actividad Física
          </h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('catalogo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'catalogo'
                ? 'bg-orange-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Tipos de ejercicio ({exerciseCatalog.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('personalizado')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'personalizado'
                ? 'bg-orange-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Actividad libre / Reloj
          </button>
        </div>
      </div>

      {/* Formulario de registro de ejercicio */}
      <form
        onSubmit={handleSubmitExercise}
        className="p-6 sm:p-8 border-b border-slate-800 bg-[#0D1526] space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Selección de ejercicio */}
          <div className="lg:col-span-6 space-y-2.5">
            {mode === 'catalogo' ? (
              <>
                <label
                  htmlFor="exercise-search"
                  className="block text-xs font-semibold text-slate-300"
                >
                  1. Selecciona el tipo de ejercicio
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="exercise-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ej. Correr, pesas, ciclismo, fútbol, natación, HIIT..."
                    className="w-full pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 bg-[#111A2E] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="h-44 overflow-y-auto bg-[#111A2E] border border-slate-800 rounded-lg divide-y divide-slate-800/80">
                  {filteredExercises.map((ex) => {
                    const isSelected = activeExercise?.id === ex.id;
                    const metPreview = ex.metsByIntensity[intensity];
                    const kcalPreview = calculateExerciseCalories(
                      metPreview,
                      profile.currentWeightKg,
                      durationMinutes
                    );
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => setSelectedExerciseId(ex.id)}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/15 text-white'
                            : 'hover:bg-slate-800/60 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ex.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {ex.category} · {metPreview.toFixed(1)} MET ({intensity.toLowerCase()})
                          </p>
                        </div>
                        <div className="text-right shrink-0 font-mono text-xs tabular-nums">
                          <p className="font-bold text-orange-400">
                            ~{kcalPreview} kcal
                          </p>
                          <p className="text-slate-500">{durationMinutes} min</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre de la actividad física
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ej. Entrenamiento funcional en parque / Escalada"
                    className="w-full px-3 py-2 text-sm text-white placeholder:text-slate-500 bg-[#111A2E] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-white bg-[#111A2E] border border-slate-700 rounded-lg"
                  >
                    <option value="Cardio">Cardio</option>
                    <option value="Fuerza">Fuerza</option>
                    <option value="Fuerza y Cardio">Fuerza y Cardio</option>
                    <option value="Deportes">Deportes</option>
                    <option value="Movilidad">Movilidad</option>
                  </select>
                </div>

                <div className="pt-1 space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useManualKcalOverride}
                      onChange={(e) =>
                        setUseManualKcalOverride(e.target.checked)
                      }
                      className="rounded border-slate-600 bg-slate-900 text-orange-500 focus:ring-orange-500"
                    />
                    <span>
                      Ingresar calorías exactas medidas por reloj deportivo
                    </span>
                  </label>

                  {useManualKcalOverride && (
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="4000"
                        value={manualKcalBurned}
                        onChange={(e) =>
                          setManualKcalBurned(Number(e.target.value))
                        }
                        className="w-40 px-3 py-2 text-sm font-mono font-bold text-white bg-[#111A2E] border border-slate-700 rounded-lg tabular-nums"
                      />
                      <span className="ml-2 text-xs text-slate-400">
                        kcal quemadas
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Duración, Intensidad y Vista Previa de Quema + Ajuste */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Duración */}
              <div>
                <label
                  htmlFor="duration-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  2. Duración del ejercicio (minutos)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="duration-input"
                    type="number"
                    min="1"
                    max="600"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(Math.max(1, Number(e.target.value)))
                    }
                    className="w-24 px-3 py-2 text-sm font-mono font-bold text-white bg-[#111A2E] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 tabular-nums"
                  />
                  {[20, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2.5 py-2 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap tabular-nums cursor-pointer ${
                        durationMinutes === mins
                          ? 'bg-orange-500 text-slate-950 border-orange-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensidad */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    3. Nivel de intensidad
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedIntensityHint}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  {INTENSITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.level}
                      type="button"
                      onClick={() => setIntensity(opt.level)}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        intensity === opt.level
                          ? 'bg-orange-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resultado calculado + Botón Registrar */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums">
                  <span className="text-sm font-bold text-orange-400">
                    {estimatedBurnedKcal} kcal quemadas
                  </span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-slate-300">
                    Peso ref: {profile.currentWeightKg.toFixed(1)} kg
                  </span>
                </div>
                <p className="text-xs text-emerald-400 font-mono tabular-nums">
                  Incrementa tu ingesta diaria recomendada en +{estimatedRecommendedIncrease} kcal
                </p>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-orange-500 hover:bg-orange-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar actividad</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Tabla de sesiones de actividad física registradas en el día */}
      {exercisesForDay.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <p className="text-sm font-medium text-white">
            Sin sesiones de actividad física registradas en esta fecha.
          </p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Al registrar tus entrenamientos o caminatas, NutriBalance calcula las calorías quemadas según tu peso actual ({profile.currentWeightKg.toFixed(1)} kg) y ajusta tu meta calórica diaria automáticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 bg-[#0D1526]">
                <th className="py-3 pl-6 pr-4">Ejercicio registrado</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Duración</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Intensidad</th>
                <th className="py-3 px-4 text-right whitespace-nowrap text-orange-400">
                  Calorías quemadas
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap text-emerald-400">
                  Ajuste a meta
                </th>
                <th className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {exercisesForDay.map((ex) => {
                const liveKcal = ex.isManualCalories
                  ? ex.caloriesBurned
                  : calculateExerciseCalories(
                      ex.metUsed,
                      profile.currentWeightKg,
                      ex.durationMinutes
                    );
                const liveAdjustment = Math.round(
                  liveKcal * profile.exerciseCalorieAdjustmentRatio
                );

                return (
                  <tr
                    key={ex.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 pl-6 pr-4">
                      <p className="font-medium text-white">{ex.name}</p>
                      <p className="text-xs text-slate-400">
                        {ex.category} ·{' '}
                        {ex.isManualCalories
                          ? 'Lectura directa'
                          : `${ex.metUsed.toFixed(1)} MET`}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200 tabular-nums whitespace-nowrap">
                      {ex.durationMinutes} min
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-300 whitespace-nowrap">
                      {ex.intensity}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-orange-400 tabular-nums whitespace-nowrap">
                      {liveKcal} kcal
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400 tabular-nums whitespace-nowrap">
                      +{liveAdjustment} kcal
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteExercise(ex.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                        aria-label={`Eliminar actividad ${ex.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-800 bg-[#0D1526] font-mono text-xs sm:text-sm font-bold text-white tabular-nums">
                <td className="py-3.5 pl-6 pr-4 font-sans">
                  Total actividad física del día
                </td>
                <td className="py-3.5 px-4 text-right text-slate-300">
                  {summary.totalExerciseMinutes} min
                </td>
                <td className="py-3.5 px-4 text-right text-xs font-sans font-normal text-slate-400">
                  Reposición {Math.round(profile.exerciseCalorieAdjustmentRatio * 100)}%
                </td>
                <td className="py-3.5 px-4 text-right text-orange-400">
                  {summary.burnedExerciseCalories.toLocaleString('es-ES')} kcal
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-400">
                  +{summary.exerciseAdjustmentCalories.toLocaleString('es-ES')} kcal en meta
                </td>
                <td className="py-3.5 pl-4 pr-6" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
