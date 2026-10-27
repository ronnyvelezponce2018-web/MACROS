import {
  BaselineActivity,
  BiologicalSex,
  ComputedDailySummary,
  GoalPace,
  LoggedExercise,
  LoggedMeal,
  UserNutritionProfile,
} from '../types/nutrition';

export function getLocalTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateISO(dateISO: string, deltaDays: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatSpanishDate(dateISO: string): string {
  const today = getLocalTodayISO();
  const yesterday = shiftDateISO(today, -1);
  const tomorrow = shiftDateISO(today, 1);

  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const formatted = dt.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (dateISO === today) return `Hoy · ${formatted}`;
  if (dateISO === yesterday) return `Ayer · ${formatted}`;
  if (dateISO === tomorrow) return `Mañana · ${formatted}`;
  return formatted;
}

export function calculateExerciseCalories(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  if (weightKg <= 0 || durationMinutes <= 0 || met <= 0) return 0;
  // Fórmula estándar ACSM / Compendium of Physical Activities: kcal = MET * peso(kg) * horas
  return Math.round(met * weightKg * (durationMinutes / 60));
}

export function roundMacro(val: number): number {
  return Math.round(val * 10) / 10;
}

export function computeDailySummary(
  profile: UserNutritionProfile,
  mealsForDay: LoggedMeal[],
  exercisesForDay: LoggedExercise[]
): ComputedDailySummary {
  const safeWeight = Math.max(30, profile.currentWeightKg || 70);
  const safeHeight = Math.max(120, profile.heightCm || 170);
  const safeAge = Math.max(14, profile.age || 30);

  // Ecuación Mifflin-St Jeor para TMB (BMR)
  const sexConstant = profile.sex === BiologicalSex.MASCULINO ? 5 : -161;
  const bmrCalories = Math.round(
    10 * safeWeight + 6.25 * safeHeight - 5 * safeAge + sexConstant
  );

  // Factor de actividad cotidiana sin ejercicio estructurado (ya que el ejercicio se registra y suma aparte)
  const activityMultipliers: Record<BaselineActivity, number> = {
    [BaselineActivity.SEDENTARIO]: 1.2,
    [BaselineActivity.LIGERO]: 1.32,
    [BaselineActivity.ACTIVO]: 1.45,
  };
  const tdeeBaseCalories = Math.round(
    bmrCalories * activityMultipliers[profile.baselineActivity]
  );

  // Ajuste según Peso Actual vs Peso Objetivo
  const weightDiff = profile.targetWeightKg - profile.currentWeightKg;
  let goalDeltaCalories = 0;

  const paceMagnitudes: Record<GoalPace, number> = {
    [GoalPace.SUAVE]: 250,
    [GoalPace.ESTANDAR]: 450,
    [GoalPace.INTENSIVO]: 650,
  };
  const magnitude = paceMagnitudes[profile.goalPace];

  if (weightDiff < -0.25) {
    goalDeltaCalories = -magnitude; // Déficit para reducir peso
  } else if (weightDiff > 0.25) {
    // Superávit moderado para ganancia de masa
    goalDeltaCalories = Math.round(magnitude * 0.75);
  } else {
    goalDeltaCalories = 0; // Mantenimiento
  }

  const minHealthyCalories = profile.sex === BiologicalSex.MASCULINO ? 1400 : 1200;
  const autoBaseCalories = Math.max(
    minHealthyCalories,
    tdeeBaseCalories + goalDeltaCalories
  );

  const baseRecommendedCalories = profile.useManualTargets
    ? Math.max(800, Math.round(profile.manualBaseCalories))
    : autoBaseCalories;

  // Calorías quemadas en actividad física registrada ese día
  // Si el ejercicio no fue ingresado con calorías manuales fijas, recalcula con el peso actual del usuario
  const burnedExerciseCalories = exercisesForDay.reduce((acc, ex) => {
    const kcal = ex.isManualCalories
      ? ex.caloriesBurned
      : calculateExerciseCalories(ex.metUsed, safeWeight, ex.durationMinutes);
    return acc + kcal;
  }, 0);

  const totalExerciseMinutes = exercisesForDay.reduce(
    (acc, ex) => acc + ex.durationMinutes,
    0
  );

  const exerciseAdjustmentCalories = Math.round(
    burnedExerciseCalories * profile.exerciseCalorieAdjustmentRatio
  );

  const adjustedRecommendedCalories =
    baseRecommendedCalories + exerciseAdjustmentCalories;

  // Distribución diaria de macronutrientes objetivos ajustada a la actividad física
  let targetProteinGrams: number;
  let targetFatGrams: number;
  let targetCarbsGrams: number;

  if (profile.useManualTargets) {
    // Si tiene metas manuales base, escalamos carbohidratos y proteínas con el gasto por ejercicio
    // (70% carbohidratos para reponer glucógeno, 30% proteína/grasa)
    const extraCarbs = Math.round((exerciseAdjustmentCalories * 0.65) / 4);
    const extraProtein = Math.round((exerciseAdjustmentCalories * 0.2) / 4);
    const extraFat = Math.round((exerciseAdjustmentCalories * 0.15) / 9);
    targetCarbsGrams = Math.max(0, Math.round(profile.manualCarbsGrams) + extraCarbs);
    targetProteinGrams = Math.max(
      0,
      Math.round(profile.manualProteinGrams) + extraProtein
    );
    targetFatGrams = Math.max(0, Math.round(profile.manualFatGrams) + extraFat);
  } else {
    // Proteína científica: ~1.9 g/kg en pérdida de peso o ganancia, ~1.6 g/kg en mantenimiento
    const proteinFactor = Math.abs(weightDiff) > 0.25 ? 1.9 : 1.65;
    // Usamos un peso de referencia equilibrado entre actual y objetivo para evitar extremos
    const referenceWeight =
      safeWeight * 0.7 + Math.max(35, profile.targetWeightKg) * 0.3;
    const baseProtein = Math.round(referenceWeight * proteinFactor);
    const extraExerciseProtein = Math.round((exerciseAdjustmentCalories * 0.15) / 4);
    targetProteinGrams = baseProtein + extraExerciseProtein;

    // Grasas esenciales: ~27% del requerimiento ajustado
    targetFatGrams = Math.max(
      40,
      Math.round((adjustedRecommendedCalories * 0.27) / 9)
    );

    // El resto de calorías ajustadas se asigna a carbohidratos (combustible energético)
    const remainingKcalForCarbs =
      adjustedRecommendedCalories - targetProteinGrams * 4 - targetFatGrams * 9;
    targetCarbsGrams = Math.max(50, Math.round(remainingKcalForCarbs / 4));
  }

  // Totales consumidos del día
  const consumedCalories = Math.round(
    mealsForDay.reduce((sum, m) => sum + m.calories, 0)
  );
  const consumedCarbsGrams = roundMacro(
    mealsForDay.reduce((sum, m) => sum + m.carbs, 0)
  );
  const consumedProteinGrams = roundMacro(
    mealsForDay.reduce((sum, m) => sum + m.protein, 0)
  );
  const consumedFatGrams = roundMacro(
    mealsForDay.reduce((sum, m) => sum + m.fat, 0)
  );

  const remainingCalories = adjustedRecommendedCalories - consumedCalories;

  return {
    bmrCalories,
    tdeeBaseCalories,
    goalDeltaCalories,
    baseRecommendedCalories,
    burnedExerciseCalories,
    exerciseAdjustmentCalories,
    adjustedRecommendedCalories,
    targetCarbsGrams,
    targetProteinGrams,
    targetFatGrams,
    consumedCalories,
    consumedCarbsGrams,
    consumedProteinGrams,
    consumedFatGrams,
    remainingCalories,
    totalExerciseMinutes,
  };
}
