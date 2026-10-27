import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Link2, RotateCcw } from 'lucide-react';
import { ActivityTrackerSection } from './components/ActivityTrackerSection';
import { EnergySummary } from './components/EnergySummary';
import { MealTrackerSection } from './components/MealTrackerSection';
import { WeeklyMealPlanSection } from './components/WeeklyMealPlanSection';
import { WeightGoalSection } from './components/WeightGoalSection';
import { DEFAULT_FOOD_CATALOG, EXERCISE_CATALOG } from './data/catalog';
import {
  BaselineActivity,
  BiologicalSex,
  ExerciseIntensity,
  FoodCatalogItem,
  GoalPace,
  LoggedExercise,
  LoggedMeal,
  MealCategory,
  UserNutritionProfile,
  WeeklyMealPlan,
  WeightLogEntry,
} from './types/nutrition';
import {
  calculateExerciseCalories,
  computeDailySummary,
  formatSpanishDate,
  getLocalTodayISO,
  roundMacro,
  shiftDateISO,
} from './utils/calculations';

const PUBLIC_APP_URL =
  'https://ais-pre-z6kzpv5di4fycbo4o5jpbd-323257412942.us-west1.run.app/index.html';

const STORAGE_KEYS = {
  PROFILE: 'nutribalance_profile_v1',
  MEALS: 'nutribalance_meals_v1',
  EXERCISES: 'nutribalance_exercises_v1',
  WEIGHT_LOGS: 'nutribalance_weight_logs_v1',
  CUSTOM_FOODS: 'nutribalance_custom_foods_v1',
  WEEKLY_PLAN: 'nutribalance_weekly_plan_v1',
};

const DEFAULT_PROFILE: UserNutritionProfile = {
  currentWeightKg: 78.5,
  initialWeightKg: 81.0,
  targetWeightKg: 73.0,
  heightCm: 175,
  age: 29,
  sex: BiologicalSex.MASCULINO,
  baselineActivity: BaselineActivity.LIGERO,
  goalPace: GoalPace.ESTANDAR,
  useManualTargets: false,
  manualBaseCalories: 2050,
  manualCarbsGrams: 220,
  manualProteinGrams: 150,
  manualFatGrams: 62,
  exerciseCalorieAdjustmentRatio: 1,
};

function createInitialMeals(todayISO: string): LoggedMeal[] {
  return [
    {
      id: 'seed-meal-1',
      date: todayISO,
      name: 'Huevo entero cocido o revuelto',
      category: MealCategory.DESAYUNO,
      grams: 120,
      calories: 186,
      carbs: 1.3,
      protein: 15.6,
      fat: 13.2,
      baseCaloriesPer100g: 155,
      baseCarbsPer100g: 1.1,
      baseProteinPer100g: 13,
      baseFatPer100g: 11,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-meal-2',
      date: todayISO,
      name: 'Avena en hojuelas (cruda)',
      category: MealCategory.DESAYUNO,
      grams: 60,
      calories: 233,
      carbs: 39.8,
      protein: 10.1,
      fat: 4.1,
      baseCaloriesPer100g: 389,
      baseCarbsPer100g: 66.3,
      baseProteinPer100g: 16.9,
      baseFatPer100g: 6.9,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-meal-3',
      date: todayISO,
      name: 'Pechuga de pollo a la plancha',
      category: MealCategory.ALMUERZO,
      grams: 180,
      calories: 297,
      carbs: 0,
      protein: 55.8,
      fat: 6.5,
      baseCaloriesPer100g: 165,
      baseCarbsPer100g: 0,
      baseProteinPer100g: 31,
      baseFatPer100g: 3.6,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-meal-4',
      date: todayISO,
      name: 'Arroz integral cocido',
      category: MealCategory.ALMUERZO,
      grams: 180,
      calories: 221,
      carbs: 46.1,
      protein: 4.9,
      fat: 1.8,
      baseCaloriesPer100g: 123,
      baseCarbsPer100g: 25.6,
      baseProteinPer100g: 2.7,
      baseFatPer100g: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-meal-5',
      date: todayISO,
      name: 'Aguacate / Palta fresca',
      category: MealCategory.ALMUERZO,
      grams: 75,
      calories: 120,
      carbs: 6.4,
      protein: 1.5,
      fat: 11,
      baseCaloriesPer100g: 160,
      baseCarbsPer100g: 8.5,
      baseProteinPer100g: 2,
      baseFatPer100g: 14.7,
      createdAt: new Date().toISOString(),
    },
  ];
}

function createInitialExercises(
  todayISO: string,
  weightKg: number
): LoggedExercise[] {
  const met = 5.0;
  const durationMinutes = 45;
  return [
    {
      id: 'seed-ex-1',
      date: todayISO,
      exerciseId: 'entrenamiento-pesas',
      name: 'Entrenamiento de fuerza / Pesas',
      category: 'Fuerza',
      durationMinutes,
      intensity: ExerciseIntensity.MODERADA,
      metUsed: met,
      caloriesBurned: calculateExerciseCalories(met, weightKg, durationMinutes),
      isManualCalories: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

function createInitialWeightLogs(todayISO: string): WeightLogEntry[] {
  return [
    {
      id: 'seed-w-1',
      date: shiftDateISO(todayISO, -14),
      weightKg: 81.0,
      note: 'Inicio del plan',
    },
    {
      id: 'seed-w-2',
      date: shiftDateISO(todayISO, -7),
      weightKg: 79.6,
      note: 'Semana 1',
    },
    {
      id: 'seed-w-3',
      date: todayISO,
      weightKg: 78.5,
      note: 'Control actual',
    },
  ];
}

function loadJSON<T>(key: string, fallback: () => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback();
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

export default function App() {
  const todayISO = useMemo(() => getLocalTodayISO(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [profile, setProfile] = useState<UserNutritionProfile>(() =>
    loadJSON(STORAGE_KEYS.PROFILE, () => DEFAULT_PROFILE)
  );

  const [meals, setMeals] = useState<LoggedMeal[]>(() =>
    loadJSON(STORAGE_KEYS.MEALS, () => createInitialMeals(todayISO))
  );

  const [exercises, setExercises] = useState<LoggedExercise[]>(() =>
    loadJSON(STORAGE_KEYS.EXERCISES, () =>
      createInitialExercises(todayISO, DEFAULT_PROFILE.currentWeightKg)
    )
  );

  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>(() =>
    loadJSON(STORAGE_KEYS.WEIGHT_LOGS, () => createInitialWeightLogs(todayISO))
  );

  const [customFoods, setCustomFoods] = useState<FoodCatalogItem[]>(() =>
    loadJSON(STORAGE_KEYS.CUSTOM_FOODS, () => [])
  );

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(() =>
    loadJSON<WeeklyMealPlan | null>(STORAGE_KEYS.WEEKLY_PLAN, () => null)
  );

  const foodSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.EXERCISES,
      JSON.stringify(exercises)
    );
  }, [exercises]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.WEIGHT_LOGS,
      JSON.stringify(weightLogs)
    );
  }, [weightLogs]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.CUSTOM_FOODS,
      JSON.stringify(customFoods)
    );
  }, [customFoods]);

  useEffect(() => {
    if (weeklyPlan) {
      window.localStorage.setItem(
        STORAGE_KEYS.WEEKLY_PLAN,
        JSON.stringify(weeklyPlan)
      );
    }
  }, [weeklyPlan]);

  const combinedCatalog = useMemo(
    () => [...customFoods, ...DEFAULT_FOOD_CATALOG],
    [customFoods]
  );

  const mealsForSelectedDate = useMemo(
    () => meals.filter((m) => m.date === selectedDate),
    [meals, selectedDate]
  );

  const exercisesForSelectedDate = useMemo(
    () => exercises.filter((ex) => ex.date === selectedDate),
    [exercises, selectedDate]
  );

  const dailySummary = useMemo(
    () =>
      computeDailySummary(
        profile,
        mealsForSelectedDate,
        exercisesForSelectedDate
      ),
    [profile, mealsForSelectedDate, exercisesForSelectedDate]
  );

  const handleAddMeal = (newMeal: Omit<LoggedMeal, 'id' | 'createdAt'>) => {
    const created: LoggedMeal = {
      ...newMeal,
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setMeals((prev) => [...prev, created]);
  };

  const handleImportMealsBatch = (
    batch: Omit<LoggedMeal, 'id' | 'createdAt'>[]
  ) => {
    const now = new Date().toISOString();
    const createdItems: LoggedMeal[] = batch.map((m, idx) => ({
      ...m,
      id: `meal-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
    }));
    setMeals((prev) => [...prev, ...createdItems]);
  };

  const handleUpdateMealGrams = (id: string, newGrams: number) => {
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const safeGrams = Math.max(5, Math.round(newGrams));
        if (
          m.baseCaloriesPer100g !== undefined &&
          m.baseCarbsPer100g !== undefined &&
          m.baseProteinPer100g !== undefined &&
          m.baseFatPer100g !== undefined
        ) {
          const factor = safeGrams / 100;
          return {
            ...m,
            grams: safeGrams,
            calories: Math.round(m.baseCaloriesPer100g * factor),
            carbs: roundMacro(m.baseCarbsPer100g * factor),
            protein: roundMacro(m.baseProteinPer100g * factor),
            fat: roundMacro(m.baseFatPer100g * factor),
          };
        }
        const scale = safeGrams / Math.max(1, m.grams);
        return {
          ...m,
          grams: safeGrams,
          calories: Math.round(m.calories * scale),
          carbs: roundMacro(m.carbs * scale),
          protein: roundMacro(m.protein * scale),
          fat: roundMacro(m.fat * scale),
        };
      })
    );
  };

  const handleDeleteMeal = (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddCustomFood = (food: FoodCatalogItem) => {
    setCustomFoods((prev) => [food, ...prev]);
  };

  const handleAddExercise = (
    newEx: Omit<LoggedExercise, 'id' | 'createdAt'>
  ) => {
    const created: LoggedExercise = {
      ...newEx,
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setExercises((prev) => [...prev, created]);
  };

  const handleDeleteExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddWeightLog = (
    weightKg: number,
    date: string,
    note?: string
  ) => {
    setWeightLogs((prev) => {
      const filtered = prev.filter((w) => w.date !== date);
      return [
        ...filtered,
        {
          id: `w-${Date.now()}`,
          date,
          weightKg,
          note,
        },
      ];
    });
  };

  const handleDeleteWeightLog = (id: string) => {
    setWeightLogs((prev) => prev.filter((w) => w.id !== id));
  };

  const handleClearCurrentDay = () => {
    setMeals((prev) => prev.filter((m) => m.date !== selectedDate));
    setExercises((prev) => prev.filter((e) => e.date !== selectedDate));
  };

  const scrollToMealInput = () => {
    const el = document.getElementById('comidas');
    el?.scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => {
      foodSearchInputRef.current?.focus();
    }, 350);
  };

  const handleCopyLink = async () => {
    try {
      const urlToCopy =
        typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/index.html`
          : PUBLIC_APP_URL;
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120] text-slate-100">
      {/* Top Bar Contract: Exactamente 3 zonas separadas por gap-8 */}
      <header className="sticky top-0 z-30 bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
          {/* Zona 1: Marca en una sola línea */}
          <a
            href="#resumen"
            className="text-lg font-extrabold tracking-tight text-emerald-400 whitespace-nowrap shrink-0"
          >
            NutriBalance
          </a>

          {/* Zona 2: 5 enlaces de navegación limpios en una sola línea */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
          >
            <a
              href="#resumen"
              className="hover:text-emerald-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Resumen
            </a>
            <a
              href="#peso"
              className="hover:text-sky-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Peso y Meta
            </a>
            <a
              href="#comidas"
              className="hover:text-emerald-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Comidas
            </a>
            <a
              href="#actividad"
              className="hover:text-orange-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Actividad Física
            </a>
            <a
              href="#plan-semanal"
              className="hover:text-amber-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Plan Semanal
            </a>
          </nav>

          {/* Zona 3: 1 acción primaria vibrante */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={scrollToMealInput}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Registrar Comida
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal del Espacio de Trabajo */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Barra de control de fecha del diario nutricional */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-[#111A2E] border border-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDateISO(d, -1))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-semibold text-white whitespace-nowrap">
                {formatSpanishDate(selectedDate)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDateISO(d, 1))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                aria-label="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              aria-label="Seleccionar fecha específica"
              className="px-3 py-1.5 text-xs font-mono text-slate-200 bg-[#111A2E] border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 tabular-nums"
            />

            {selectedDate !== todayISO && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayISO)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                Volver a hoy
              </button>
            )}
          </div>

          {(mealsForSelectedDate.length > 0 ||
            exercisesForSelectedDate.length > 0) && (
            <button
              type="button"
              onClick={handleClearCurrentDay}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors self-start sm:self-auto whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Vaciar registros de esta fecha</span>
            </button>
          )}
        </div>

        {/* 1. Resumen Diario de Calorías Ajustadas y Macronutrientes */}
        <EnergySummary summary={dailySummary} profile={profile} />

        {/* 2. Peso Actual, Peso Objetivo y Perfil Metabólico */}
        <WeightGoalSection
          profile={profile}
          summary={dailySummary}
          weightLogs={weightLogs}
          selectedDate={selectedDate}
          onUpdateProfile={setProfile}
          onAddWeightLog={handleAddWeightLog}
          onDeleteWeightLog={handleDeleteWeightLog}
        />

        {/* 3. Registro Diario de Comidas y Conteo de Macronutrientes */}
        <MealTrackerSection
          selectedDate={selectedDate}
          catalog={combinedCatalog}
          mealsForDay={mealsForSelectedDate}
          foodSearchInputRef={foodSearchInputRef}
          onAddMeal={handleAddMeal}
          onUpdateMealGrams={handleUpdateMealGrams}
          onDeleteMeal={handleDeleteMeal}
          onAddCustomFoodToCatalog={handleAddCustomFood}
        />

        {/* 4. Seguimiento de Actividad Física y Ajuste de Meta Calórica */}
        <ActivityTrackerSection
          selectedDate={selectedDate}
          profile={profile}
          summary={dailySummary}
          exerciseCatalog={EXERCISE_CATALOG}
          exercisesForDay={exercisesForSelectedDate}
          onAddExercise={handleAddExercise}
          onDeleteExercise={handleDeleteExercise}
        />

        {/* 5. Generador de Plan de Comidas Personalizado de 7 Días */}
        <WeeklyMealPlanSection
          profile={profile}
          summary={dailySummary}
          allLoggedMeals={meals}
          selectedDate={selectedDate}
          weeklyPlan={weeklyPlan}
          onSaveWeeklyPlan={setWeeklyPlan}
          onImportMealsToCurrentDate={handleImportMealsBatch}
        />
      </main>

      {/* Pie de página limpio con enlace directo a index.html */}
      <footer className="mt-12 border-t border-slate-800 bg-[#0D1526]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            NutriBalance · Control diario de peso corporal, macronutrientes, actividad física y planificación semanal.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/index.html"
              className="text-emerald-400 hover:underline font-medium whitespace-nowrap"
            >
              Enlace directo (index.html)
            </a>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Enlace copiado</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
