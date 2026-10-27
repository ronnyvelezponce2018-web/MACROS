import React, { useEffect, useState } from 'react';
import { CalendarDays, Check, Download, Plus, RefreshCw } from 'lucide-react';
import {
  ComputedDailySummary,
  LoggedMeal,
  MealCategory,
  UserNutritionProfile,
  WeeklyMealPlan,
  WeeklyPlanMeal,
} from '../types/nutrition';

interface WeeklyMealPlanSectionProps {
  profile: UserNutritionProfile;
  summary: ComputedDailySummary;
  allLoggedMeals: LoggedMeal[];
  selectedDate: string;
  weeklyPlan: WeeklyMealPlan | null;
  onSaveWeeklyPlan: (plan: WeeklyMealPlan) => void;
  onImportMealsToCurrentDate: (
    meals: Omit<LoggedMeal, 'id' | 'createdAt'>[]
  ) => void;
}

const DIETARY_STYLES = [
  'Equilibrada tradicional',
  'Alta en proteínas',
  'Mediterránea',
  'Vegetariana',
  'Sin lactosa',
  'Baja en azúcares simples',
];

export function WeeklyMealPlanSection({
  profile,
  summary,
  allLoggedMeals,
  selectedDate,
  weeklyPlan,
  onSaveWeeklyPlan,
  onImportMealsToCurrentDate,
}: WeeklyMealPlanSectionProps) {
  const todayMealsCount = allLoggedMeals.filter(
    (m) => m.date === selectedDate
  ).length;
  const [mealsPerDayCount, setMealsPerDayCount] = useState<number>(
    todayMealsCount >= 2 && todayMealsCount <= 6 ? todayMealsCount : 4
  );
  const [dietaryStyle, setDietaryStyle] = useState<string>(DIETARY_STYLES[0]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [importedFeedback, setImportedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (weeklyPlan && activeDayIndex >= weeklyPlan.days.length) {
      setActiveDayIndex(0);
    }
  }, [weeklyPlan, activeDayIndex]);

  const registeredMealNames = Array.from(
    new Set(allLoggedMeals.map((m) => m.name))
  ).slice(0, 10);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentWeightKg: profile.currentWeightKg,
          targetWeightKg: profile.targetWeightKg,
          mealsPerDayCount,
          registeredMealsSample: registeredMealNames,
          targetCalories: summary.adjustedRecommendedCalories,
          targetCarbs: summary.targetCarbsGrams,
          targetFat: summary.targetFatGrams,
          targetProtein: summary.targetProteinGrams,
          dietaryStyle,
          additionalNotes: additionalNotes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Error inesperado al generar el plan semanal.'
        );
      }

      onSaveWeeklyPlan(data as WeeklyMealPlan);
      setActiveDayIndex(0);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con el servidor para generar el plan.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerFeedback = (msg: string) => {
    setImportedFeedback(msg);
    window.setTimeout(() => setImportedFeedback(null), 2200);
  };

  const handleImportSingleMeal = (meal: WeeklyPlanMeal) => {
    const safeGrams = Math.max(1, meal.grams);
    const ratio100 = 100 / safeGrams;
    onImportMealsToCurrentDate([
      {
        date: selectedDate,
        name: meal.name,
        category: Object.values(MealCategory).includes(meal.category)
          ? meal.category
          : MealCategory.ALMUERZO,
        grams: safeGrams,
        calories: meal.calories,
        carbs: meal.carbs,
        protein: meal.protein,
        fat: meal.fat,
        baseCaloriesPer100g: Math.round(meal.calories * ratio100 * 10) / 10,
        baseCarbsPer100g: Math.round(meal.carbs * ratio100 * 10) / 10,
        baseProteinPer100g: Math.round(meal.protein * ratio100 * 10) / 10,
        baseFatPer100g: Math.round(meal.fat * ratio100 * 10) / 10,
      },
    ]);
    triggerFeedback(`"${meal.name}" agregada al día actual`);
  };

  const handleImportWholeDay = () => {
    if (!weeklyPlan) return;
    const selectedDay = weeklyPlan.days[activeDayIndex];
    if (!selectedDay) return;

    const toImport: Omit<LoggedMeal, 'id' | 'createdAt'>[] =
      selectedDay.meals.map((meal) => {
        const safeGrams = Math.max(1, meal.grams);
        const ratio100 = 100 / safeGrams;
        return {
          date: selectedDate,
          name: meal.name,
          category: Object.values(MealCategory).includes(meal.category)
            ? meal.category
            : MealCategory.ALMUERZO,
          grams: safeGrams,
          calories: meal.calories,
          carbs: meal.carbs,
          protein: meal.protein,
          fat: meal.fat,
          baseCaloriesPer100g: Math.round(meal.calories * ratio100 * 10) / 10,
          baseCarbsPer100g: Math.round(meal.carbs * ratio100 * 10) / 10,
          baseProteinPer100g: Math.round(meal.protein * ratio100 * 10) / 10,
          baseFatPer100g: Math.round(meal.fat * ratio100 * 10) / 10,
        };
      });

    onImportMealsToCurrentDate(toImport);
    triggerFeedback(
      `Menú completo de ${selectedDay.dayName} cargado en tu registro`
    );
  };

  const activeDay = weeklyPlan?.days[activeDayIndex] ?? null;

  return (
    <section
      id="plan-semanal"
      aria-labelledby="plan-semanal-heading"
      className="bg-[#111A2E] border border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Cabecera y resumen de objetivos vinculados en tiempo real */}
      <div className="p-6 sm:p-8 border-b border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-amber-400 font-medium">
              Planificación nutricional de 7 días · Adaptado a tu peso objetivo, comidas habituales y metas exactas
            </p>
            <h2
              id="plan-semanal-heading"
              className="mt-1 text-xl font-bold tracking-tight text-white"
            >
              Plan de Comidas Personalizado para la Semana
            </h2>
          </div>

          {importedFeedback && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg self-start lg:self-auto">
              <Check className="w-3.5 h-3.5" />
              <span>{importedFeedback}</span>
            </div>
          )}
        </div>

        {/* Parámetros objetivos sincronizados automáticamente */}
        <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 font-mono tabular-nums">
          <span>
            Peso objetivo:{' '}
            <strong className="text-white">
              {profile.targetWeightKg.toFixed(1)} kg
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Meta diaria:{' '}
            <strong className="text-emerald-400">
              {summary.adjustedRecommendedCalories.toLocaleString('es-ES')} kcal
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Carbohidratos:{' '}
            <strong className="text-orange-400">
              {summary.targetCarbsGrams} g
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Proteínas:{' '}
            <strong className="text-sky-400">
              {summary.targetProteinGrams} g
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Grasas:{' '}
            <strong className="text-amber-400">
              {summary.targetFatGrams} g
            </strong>
          </span>
        </div>
      </div>

      {/* Formulario de configuración del generador semanal */}
      <form
        onSubmit={handleGeneratePlan}
        className="p-6 sm:p-8 border-b border-slate-800 bg-[#0D1526] space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Comidas al día
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {[3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setMealsPerDayCount(count)}
                  className={`py-1.5 text-xs font-mono font-bold rounded-md transition-colors tabular-nums cursor-pointer ${
                    mealsPerDayCount === count
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="dietary-style-select"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Estilo alimentario
            </label>
            <select
              id="dietary-style-select"
              value={dietaryStyle}
              onChange={(e) => setDietaryStyle(e.target.value)}
              className="w-full px-3 py-2 text-sm text-white bg-[#111A2E] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {DIETARY_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label
              htmlFor="plan-notes-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Preferencias o alergias opcionales
            </label>
            <input
              id="plan-notes-input"
              type="text"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Ej. Sin mariscos, almuerzos rápidos para llevar..."
              className="w-full px-3 py-2 text-sm text-white placeholder:text-slate-500 bg-[#111A2E] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <p className="text-xs text-slate-400">
            {registeredMealNames.length > 0
              ? `Basado en tus comidas registradas (${registeredMealNames.slice(0, 4).join(', ')}${registeredMealNames.length > 4 ? '...' : ''}).`
              : 'Se estructurarán 7 días completos cuadrando calorías, carbohidratos, proteínas y grasas por comida.'}
          </p>

          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
            />
            <span>
              {isGenerating
                ? 'Calculando menú de 7 días...'
                : weeklyPlan
                  ? 'Regenerar plan semanal'
                  : 'Generar plan semanal personalizado'}
            </span>
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-lg"
          >
            {errorMessage}
          </div>
        )}
      </form>

      {/* Estado Cargando */}
      {isGenerating && (
        <div className="p-6 sm:p-8 space-y-4" aria-busy="true">
          <div className="flex items-center gap-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="h-8 w-20 bg-slate-800 rounded-md animate-pulse"
              />
            ))}
          </div>
          <div className="space-y-2.5 pt-2">
            {Array.from({ length: mealsPerDayCount }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 w-full bg-slate-800/80 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Estado Vacío antes de generar */}
      {!isGenerating && !weeklyPlan && (
        <div className="p-10 text-center space-y-3">
          <CalendarDays className="w-7 h-7 text-emerald-400 mx-auto" />
          <p className="text-sm font-medium text-white">
            Aún no has generado tu plan semanal personalizado
          </p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Pulsa &ldquo;Generar plan semanal personalizado&rdquo; para obtener los 7 días de la semana con cada comida calculada para alcanzar {summary.adjustedRecommendedCalories.toLocaleString('es-ES')} kcal, {summary.targetCarbsGrams}g de carbohidratos, {summary.targetFatGrams}g de grasas y {summary.targetProteinGrams}g de proteínas diarias hacia tu meta de {profile.targetWeightKg.toFixed(1)} kg.
          </p>
        </div>
      )}

      {/* Visualización del Plan Semanal Generado */}
      {!isGenerating && weeklyPlan && activeDay && (
        <div>
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {weeklyPlan.days.map((day, idx) => (
                <button
                  key={day.dayName + idx}
                  type="button"
                  onClick={() => setActiveDayIndex(idx)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeDayIndex === idx
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {day.dayName}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400">
                {activeDay.focusNote}
              </span>
              <button
                type="button"
                onClick={handleImportWholeDay}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cargar {activeDay.dayName} en mi registro de hoy</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 bg-[#0D1526]">
                  <th className="py-3 pl-6 pr-4">
                    Comida y desglose de ingredientes
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">
                    Porción
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap text-emerald-400">
                    Calorías
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap text-orange-400">
                    Carbohidratos
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap text-sky-400">
                    Proteínas
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap text-amber-400">
                    Grasas
                  </th>
                  <th className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                    Registro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {activeDay.meals.map((meal, idx) => (
                  <tr
                    key={`${activeDay.dayName}-${idx}`}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-4 max-w-md">
                      <p className="font-medium text-white">
                        {meal.category} · {meal.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {meal.ingredientsSummary}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                      {meal.grams} g
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                      {meal.calories} kcal
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-orange-300 tabular-nums whitespace-nowrap">
                      {meal.carbs} g
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-sky-300 tabular-nums whitespace-nowrap">
                      {meal.protein} g
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-300 tabular-nums whitespace-nowrap">
                      {meal.fat} g
                    </td>
                    <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleImportSingleMeal(meal)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15 rounded-md transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sumar hoy</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-800 bg-[#0D1526] font-mono text-xs sm:text-sm font-bold text-white tabular-nums">
                  <td className="py-3.5 pl-6 pr-4 font-sans">
                    <div>
                      <span>Total planificado ({activeDay.dayName})</span>
                      <span className="block text-xs font-normal text-slate-400">
                        Objetivo del plan: {weeklyPlan.targetCalories.toLocaleString('es-ES')} kcal · {weeklyPlan.targetCarbs}g Carb · {weeklyPlan.targetProtein}g Prot · {weeklyPlan.targetFat}g Grasas
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {activeDay.meals.reduce((s, m) => s + m.grams, 0)} g
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400">
                    {activeDay.totalCalories.toLocaleString('es-ES')} kcal
                  </td>
                  <td className="py-3.5 px-4 text-right text-orange-400">
                    {activeDay.totalCarbs} g
                  </td>
                  <td className="py-3.5 px-4 text-right text-sky-400">
                    {activeDay.totalProtein} g
                  </td>
                  <td className="py-3.5 px-4 text-right text-amber-400">
                    {activeDay.totalFat} g
                  </td>
                  <td className="py-3.5 pl-4 pr-6" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="px-6 py-4 bg-[#0D1526] border-t border-slate-800">
            <p className="text-xs font-medium text-slate-300 mb-2.5">
              Resumen semanal completo (promedio diario:{' '}
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {Math.round(
                  weeklyPlan.days.reduce((s, d) => s + d.totalCalories, 0) /
                    Math.max(1, weeklyPlan.days.length)
                ).toLocaleString('es-ES')}{' '}
                kcal
              </span>
              )
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {weeklyPlan.days.map((day, idx) => {
                const isSelected = idx === activeDayIndex;
                return (
                  <button
                    key={`summary-${day.dayName}-${idx}`}
                    type="button"
                    onClick={() => setActiveDayIndex(idx)}
                    className={`p-2.5 text-left rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#15223D] border-sky-400'
                        : 'bg-[#111A2E] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-white truncate">
                      {day.dayName}
                    </p>
                    <p className="mt-1 text-xs font-mono font-bold text-emerald-400 tabular-nums">
                      {day.totalCalories} kcal
                    </p>
                    <p className="mt-0.5 text-[11px] font-mono text-slate-400 tabular-nums truncate">
                      C:{Math.round(day.totalCarbs)} P:{Math.round(day.totalProtein)} G:{Math.round(day.totalFat)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
