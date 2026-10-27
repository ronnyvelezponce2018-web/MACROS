import { ComputedDailySummary, UserNutritionProfile } from '../types/nutrition';

interface EnergySummaryProps {
  summary: ComputedDailySummary;
  profile: UserNutritionProfile;
}

export function EnergySummary({ summary, profile }: EnergySummaryProps) {
  const caloriePct =
    summary.adjustedRecommendedCalories > 0
      ? Math.min(
          100,
          Math.round(
            (summary.consumedCalories / summary.adjustedRecommendedCalories) * 100
          )
        )
      : 0;

  const isOverCalories = summary.remainingCalories < -50;
  const isNearGoal =
    summary.remainingCalories >= -50 && summary.remainingCalories <= 120;

  const carbsPct =
    summary.targetCarbsGrams > 0
      ? Math.min(
          100,
          Math.round((summary.consumedCarbsGrams / summary.targetCarbsGrams) * 100)
        )
      : 0;
  const proteinPct =
    summary.targetProteinGrams > 0
      ? Math.min(
          100,
          Math.round(
            (summary.consumedProteinGrams / summary.targetProteinGrams) * 100
          )
        )
      : 0;
  const fatPct =
    summary.targetFatGrams > 0
      ? Math.min(
          100,
          Math.round((summary.consumedFatGrams / summary.targetFatGrams) * 100)
        )
      : 0;

  // Distribución porcentual de calorías reales aportadas por cada macronutriente
  const carbsKcal = summary.consumedCarbsGrams * 4;
  const proteinKcal = summary.consumedProteinGrams * 4;
  const fatKcal = summary.consumedFatGrams * 9;
  const totalMacroKcal = carbsKcal + proteinKcal + fatKcal;

  const distCarbs =
    totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const distProtein =
    totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const distFat =
    totalMacroKcal > 0 ? Math.max(0, 100 - distCarbs - distProtein) : 0;

  const weightDifference =
    Math.round((profile.targetWeightKg - profile.currentWeightKg) * 10) / 10;

  const goalDirectionLabel =
    weightDifference < -0.25
      ? `Déficit objetivo (${weightDifference} kg hacia meta)`
      : weightDifference > 0.25
        ? `Superávit objetivo (+${weightDifference} kg hacia meta)`
        : 'Mantenimiento de peso corporal';

  return (
    <section
      id="resumen"
      aria-labelledby="resumen-heading"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Bloque superior: Balance Calórico Diario Ajustado */}
      <div className="p-6 sm:p-8 border-b border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Balance energético diario</span>
              <span aria-hidden="true">·</span>
              <span>{goalDirectionLabel}</span>
              {summary.burnedExerciseCalories > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-teal-700 font-medium">
                    Meta ajustada por actividad física
                  </span>
                </>
              )}
            </div>
            <h2
              id="resumen-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
            >
              Ingesta Calórica y Macronutrientes del Día
            </h2>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm text-slate-600">
            <div>
              <span className="text-slate-500">Peso actual: </span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {profile.currentWeightKg.toFixed(1)} kg
              </span>
            </div>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <div>
              <span className="text-slate-500">Peso objetivo: </span>
              <span className="font-mono font-semibold text-teal-700 tabular-nums">
                {profile.targetWeightKg.toFixed(1)} kg
              </span>
            </div>
          </div>
        </div>

        {/* Ecuación Energética Principal */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                  {summary.consumedCalories.toLocaleString('es-ES')}
                </span>
                <span className="text-base text-slate-500 font-mono tabular-nums">
                  / {summary.adjustedRecommendedCalories.toLocaleString('es-ES')} kcal recomendadas
                </span>
              </div>

              <div className="text-sm font-medium">
                {isOverCalories ? (
                  <span className="text-red-700 font-mono tabular-nums">
                    Excedido por +{Math.abs(summary.remainingCalories).toLocaleString('es-ES')} kcal
                  </span>
                ) : isNearGoal ? (
                  <span className="text-emerald-700 font-mono tabular-nums">
                    Meta alcanzada ({summary.remainingCalories >= 0 ? `restan ${summary.remainingCalories}` : `+${Math.abs(summary.remainingCalories)}`} kcal)
                  </span>
                ) : (
                  <span className="text-slate-700 font-mono tabular-nums">
                    Disponibles: {summary.remainingCalories.toLocaleString('es-ES')} kcal
                  </span>
                )}
              </div>
            </div>

            {/* Barra de progreso calórica */}
            <div
              className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={caloriePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de ingesta calórica diaria"
            >
              <div
                className={`h-full transition-transform duration-200 origin-left ${
                  isOverCalories
                    ? 'bg-red-600'
                    : isNearGoal
                      ? 'bg-emerald-600'
                      : 'bg-teal-700'
                }`}
                style={{ width: `${caloriePct}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono tabular-nums">
              <span>
                Meta base: {summary.baseRecommendedCalories.toLocaleString('es-ES')} kcal
              </span>
              <span aria-hidden="true">+</span>
              <span className="text-teal-700">
                Ajuste ejercicio ({Math.round(profile.exerciseCalorieAdjustmentRatio * 100)}%): +{summary.exerciseAdjustmentCalories.toLocaleString('es-ES')} kcal
              </span>
              <span aria-hidden="true">=</span>
              <span className="text-slate-800 font-medium">
                Meta hoy: {summary.adjustedRecommendedCalories.toLocaleString('es-ES')} kcal
              </span>
            </div>
          </div>

          {/* Desglose rápido derecho: Quemadas vs Neto */}
          <div className="lg:col-span-5 grid grid-cols-3 divide-x divide-slate-200 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
            <div className="pr-3">
              <p className="text-xs text-slate-500">Consumidas</p>
              <p className="mt-1 text-lg sm:text-xl font-semibold font-mono text-slate-900 tabular-nums">
                {summary.consumedCalories.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-slate-400">kcal comida</p>
            </div>
            <div className="px-3">
              <p className="text-xs text-slate-500">Quemadas</p>
              <p className="mt-1 text-lg sm:text-xl font-semibold font-mono text-teal-700 tabular-nums">
                {summary.burnedExerciseCalories.toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                {summary.totalExerciseMinutes} min act.
              </p>
            </div>
            <div className="pl-3">
              <p className="text-xs text-slate-500">Balance neto</p>
              <p className="mt-1 text-lg sm:text-xl font-semibold font-mono text-slate-900 tabular-nums">
                {(
                  summary.consumedCalories - summary.burnedExerciseCalories
                ).toLocaleString('es-ES')}
              </p>
              <p className="text-xs text-slate-400">kcal netas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bloque inferior: Los 3 Macronutrientes Diarios + Proporción */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* Carbohidratos */}
        <div className="p-6 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Carbohidratos Totales
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {Math.round(carbsKcal)} kcal · {carbsPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {summary.consumedCarbsGrams}
            </span>
            <span className="text-sm text-slate-500 font-mono tabular-nums">
              / {summary.targetCarbsGrams} g
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-transform duration-200 origin-left"
              style={{ width: `${carbsPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            {summary.targetCarbsGrams - summary.consumedCarbsGrams >= 0
              ? `Restan ${(summary.targetCarbsGrams - summary.consumedCarbsGrams).toFixed(1)} g hoy`
              : `Superado por +${Math.abs(summary.targetCarbsGrams - summary.consumedCarbsGrams).toFixed(1)} g`}
          </p>
        </div>

        {/* Proteínas */}
        <div className="p-6 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Proteínas Totales
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {Math.round(proteinKcal)} kcal · {proteinPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {summary.consumedProteinGrams}
            </span>
            <span className="text-sm text-slate-500 font-mono tabular-nums">
              / {summary.targetProteinGrams} g
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-700 transition-transform duration-200 origin-left"
              style={{ width: `${proteinPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            {summary.targetProteinGrams - summary.consumedProteinGrams >= 0
              ? `Restan ${(summary.targetProteinGrams - summary.consumedProteinGrams).toFixed(1)} g hoy`
              : `Meta cubierta (+${Math.abs(summary.targetProteinGrams - summary.consumedProteinGrams).toFixed(1)} g)`}
          </p>
        </div>

        {/* Grasas */}
        <div className="p-6 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Grasas Totales
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {Math.round(fatKcal)} kcal · {fatPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
              {summary.consumedFatGrams}
            </span>
            <span className="text-sm text-slate-500 font-mono tabular-nums">
              / {summary.targetFatGrams} g
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-700 transition-transform duration-200 origin-left"
              style={{ width: `${fatPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            {summary.targetFatGrams - summary.consumedFatGrams >= 0
              ? `Restan ${(summary.targetFatGrams - summary.consumedFatGrams).toFixed(1)} g hoy`
              : `Superado por +${Math.abs(summary.targetFatGrams - summary.consumedFatGrams).toFixed(1)} g`}
          </p>
        </div>
      </div>

      {/* Barra inferior de distribución energética real */}
      {totalMacroKcal > 0 && (
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
            <span className="font-sans font-medium text-slate-700">
              Reparto energético consumido:
            </span>
            <span>Carbohidratos {distCarbs}%</span>
            <span aria-hidden="true">·</span>
            <span>Proteínas {distProtein}%</span>
            <span aria-hidden="true">·</span>
            <span>Grasas {distFat}%</span>
          </div>
          <div className="w-full sm:w-56 h-2 bg-slate-200 rounded-full overflow-hidden flex">
            <div
              className="bg-amber-600 h-full"
              style={{ width: `${distCarbs}%` }}
              title={`Carbohidratos: ${distCarbs}%`}
            />
            <div
              className="bg-teal-700 h-full"
              style={{ width: `${distProtein}%` }}
              title={`Proteínas: ${distProtein}%`}
            />
            <div
              className="bg-slate-700 h-full"
              style={{ width: `${distFat}%` }}
              title={`Grasas: ${distFat}%`}
            />
          </div>
        </div>
      )}
    </section>
  );
}
