export enum MealCategory {
  DESAYUNO = 'Desayuno',
  ALMUERZO = 'Almuerzo',
  CENA = 'Cena',
  SNACK = 'Snack',
}

export enum ExerciseIntensity {
  BAJA = 'Baja',
  MODERADA = 'Moderada',
  ALTA = 'Alta',
  MUY_ALTA = 'Muy alta',
}

export enum BiologicalSex {
  MASCULINO = 'Masculino',
  FEMENINO = 'Femenino',
}

export enum BaselineActivity {
  SEDENTARIO = 'Sedentario',
  LIGERO = 'Ligero',
  ACTIVO = 'Activo',
}

export enum GoalPace {
  SUAVE = 'Suave',
  ESTANDAR = 'Estándar',
  INTENSIVO = 'Intensivo',
}

export interface FoodCatalogItem {
  id: string;
  name: string;
  group: string;
  servingLabel: string;
  servingGrams: number;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  isCustom?: boolean;
}

export interface LoggedMeal {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: MealCategory;
  grams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  baseCaloriesPer100g?: number;
  baseCarbsPer100g?: number;
  baseProteinPer100g?: number;
  baseFatPer100g?: number;
  createdAt: string;
}

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  category: string;
  metsByIntensity: Record<ExerciseIntensity, number>;
}

export interface LoggedExercise {
  id: string;
  date: string; // YYYY-MM-DD
  exerciseId: string;
  name: string;
  category: string;
  durationMinutes: number;
  intensity: ExerciseIntensity;
  metUsed: number;
  caloriesBurned: number;
  isManualCalories?: boolean;
  createdAt: string;
}

export interface WeightLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
}

export interface UserNutritionProfile {
  currentWeightKg: number;
  initialWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
  baselineActivity: BaselineActivity;
  goalPace: GoalPace;
  useManualTargets: boolean;
  manualBaseCalories: number;
  manualCarbsGrams: number;
  manualProteinGrams: number;
  manualFatGrams: number;
  exerciseCalorieAdjustmentRatio: number; // 1 = 100% replenishment, 0.75 = 75%, 0.5 = 50%, 0 = sin ajuste
}

export interface ComputedDailySummary {
  bmrCalories: number;
  tdeeBaseCalories: number;
  goalDeltaCalories: number;
  baseRecommendedCalories: number;
  burnedExerciseCalories: number;
  exerciseAdjustmentCalories: number;
  adjustedRecommendedCalories: number;
  targetCarbsGrams: number;
  targetProteinGrams: number;
  targetFatGrams: number;
  consumedCalories: number;
  consumedCarbsGrams: number;
  consumedProteinGrams: number;
  consumedFatGrams: number;
  remainingCalories: number;
  totalExerciseMinutes: number;
}

export interface WeeklyPlanMeal {
  category: MealCategory;
  name: string;
  ingredientsSummary: string;
  grams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface WeeklyPlanDay {
  dayName: string;
  focusNote: string;
  meals: WeeklyPlanMeal[];
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
}

export interface WeeklyMealPlan {
  generatedAt: string;
  targetWeightKg: number;
  mealsPerDayCount: number;
  targetCalories: number;
  targetCarbs: number;
  targetProtein: number;
  targetFat: number;
  dietaryStyle: string;
  days: WeeklyPlanDay[];
}

