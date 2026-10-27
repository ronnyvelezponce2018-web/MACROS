import React, { useMemo, useState } from 'react';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import {
  FoodCatalogItem,
  LoggedMeal,
  MealCategory,
} from '../types/nutrition';
import { roundMacro } from '../utils/calculations';

interface MealTrackerSectionProps {
  selectedDate: string;
  catalog: FoodCatalogItem[];
  mealsForDay: LoggedMeal[];
  foodSearchInputRef: React.RefObject<HTMLInputElement | null>;
  onAddMeal: (meal: Omit<LoggedMeal, 'id' | 'createdAt'>) => void;
  onUpdateMealGrams: (id: string, newGrams: number) => void;
  onDeleteMeal: (id: string) => void;
  onAddCustomFoodToCatalog: (food: FoodCatalogItem) => void;
}

const MEAL_CATEGORIES = [
  MealCategory.DESAYUNO,
  MealCategory.ALMUERZO,
  MealCategory.CENA,
  MealCategory.SNACK,
];

export function MealTrackerSection({
  selectedDate,
  catalog,
  mealsForDay,
  foodSearchInputRef,
  onAddMeal,
  onUpdateMealGrams,
  onDeleteMeal,
  onAddCustomFoodToCatalog,
}: MealTrackerSectionProps) {
  const [entryMode, setEntryMode] = useState<'catalogo' | 'manual'>('catalogo');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState<string>(
    catalog[0]?.id ?? ''
  );
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>(
    MealCategory.ALMUERZO
  );
  const [gramsInput, setGramsInput] = useState<number>(
    catalog[0]?.servingGrams ?? 150
  );

  // Estado para modo manual / plato personalizado
  const [manualName, setManualName] = useState('');
  const [manualGrams, setManualGrams] = useState<number>(200);
  const [manualCalories, setManualCalories] = useState<number>(350);
  const [manualCarbs, setManualCarbs] = useState<number>(35);
  const [manualProtein, setManualProtein] = useState<number>(28);
  const [manualFat, setManualFat] = useState<number>(11);
  const [saveToCatalog, setSaveToCatalog] = useState<boolean>(false);

  // Filtro de tabla del día
  const [activeFilter, setActiveFilter] = useState<'TODAS' | MealCategory>('TODAS');

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [catalog, searchQuery]);

  const activeFood = useMemo(() => {
    return (
      catalog.find((f) => f.id === selectedFoodId) ||
      filteredCatalog[0] ||
      catalog[0]
    );
  }, [catalog, filteredCatalog, selectedFoodId]);

  const handleSelectFood = (food: FoodCatalogItem) => {
    setSelectedFoodId(food.id);
    setGramsInput(food.servingGrams);
  };

  // Previsualización de calorías y macros según gramos seleccionados
  const previewRatio = Math.max(0, gramsInput) / 100;
  const previewCalories = activeFood
    ? Math.round(activeFood.caloriesPer100g * previewRatio)
    : 0;
  const previewCarbs = activeFood
    ? roundMacro(activeFood.carbsPer100g * previewRatio)
    : 0;
  const previewProtein = activeFood
    ? roundMacro(activeFood.proteinPer100g * previewRatio)
    : 0;
  const previewFat = activeFood
    ? roundMacro(activeFood.fatPer100g * previewRatio)
    : 0;

  const handleAddFromCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFood || gramsInput <= 0) return;

    onAddMeal({
      date: selectedDate,
      name: activeFood.name,
      category: selectedCategory,
      grams: Math.round(gramsInput),
      calories: previewCalories,
      carbs: previewCarbs,
      protein: previewProtein,
      fat: previewFat,
      baseCaloriesPer100g: activeFood.caloriesPer100g,
      baseCarbsPer100g: activeFood.carbsPer100g,
      baseProteinPer100g: activeFood.proteinPer100g,
      baseFatPer100g: activeFood.fatPer100g,
    });
  };

  const handleCalculateManualKcalFromMacros = () => {
    const calculated = Math.round(
      manualCarbs * 4 + manualProtein * 4 + manualFat * 9
    );
    setManualCalories(calculated);
  };

  const handleAddManualMeal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = manualName.trim();
    if (!cleanName) return;

    const safeGrams = Math.max(1, Math.round(manualGrams || 100));
    const ratio100 = 100 / safeGrams;

    if (saveToCatalog) {
      const customFood: FoodCatalogItem = {
        id: `custom-${Date.now()}`,
        name: cleanName,
        group: 'Mis alimentos',
        servingLabel: '1 porción personal',
        servingGrams: safeGrams,
        caloriesPer100g: roundMacro(manualCalories * ratio100),
        carbsPer100g: roundMacro(manualCarbs * ratio100),
        proteinPer100g: roundMacro(manualProtein * ratio100),
        fatPer100g: roundMacro(manualFat * ratio100),
        isCustom: true,
      };
      onAddCustomFoodToCatalog(customFood);
    }

    onAddMeal({
      date: selectedDate,
      name: cleanName,
      category: selectedCategory,
      grams: safeGrams,
      calories: Math.max(0, Math.round(manualCalories)),
      carbs: Math.max(0, roundMacro(manualCarbs)),
      protein: Math.max(0, roundMacro(manualProtein)),
      fat: Math.max(0, roundMacro(manualFat)),
      baseCaloriesPer100g: roundMacro(manualCalories * ratio100),
      baseCarbsPer100g: roundMacro(manualCarbs * ratio100),
      baseProteinPer100g: roundMacro(manualProtein * ratio100),
      baseFatPer100g: roundMacro(manualFat * ratio100),
    });

    setManualName('');
    setSaveToCatalog(false);
  };

  const displayedMeals = useMemo(() => {
    if (activeFilter === 'TODAS') return mealsForDay;
    return mealsForDay.filter((m) => m.category === activeFilter);
  }, [mealsForDay, activeFilter]);

  const filteredTotals = useMemo(() => {
    return displayedMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        carbs: roundMacro(acc.carbs + m.carbs),
        protein: roundMacro(acc.protein + m.protein),
        fat: roundMacro(acc.fat + m.fat),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );
  }, [displayedMeals]);

  // Subtotales por momento del día
  const categorySubtotals = useMemo(() => {
    return MEAL_CATEGORIES.map((cat) => {
      const kcal = mealsForDay
        .filter((m) => m.category === cat)
        .reduce((s, m) => s + m.calories, 0);
      return { category: cat, kcal };
    });
  }, [mealsForDay]);

  return (
    <section
      id="comidas"
      aria-labelledby="comidas-heading"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Cabecera */}
      <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Registro alimentario diario · Conteo exacto de calorías, carbohidratos, proteínas y grasas
          </p>
          <h2
            id="comidas-heading"
            className="mt-1 text-xl font-bold tracking-tight text-slate-900"
          >
            Comidas Consumidas en el Día
          </h2>
        </div>

        {/* Selector de modo: Catálogo vs Plato Personalizado */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setEntryMode('catalogo')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              entryMode === 'catalogo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buscar en catálogo ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              entryMode === 'manual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Plato manual
          </button>
        </div>
      </div>

      {/* Formulario para agregar comida */}
      <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/60">
        {entryMode === 'catalogo' ? (
          <form onSubmit={handleAddFromCatalog} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Buscador y lista de alimentos */}
              <div className="lg:col-span-6 space-y-2.5">
                <label
                  htmlFor="food-search"
                  className="block text-xs font-medium text-slate-700"
                >
                  1. Busca y elige el alimento consumido
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={foodSearchInputRef}
                    id="food-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ej. Pechuga de pollo, arroz, huevo, avena, aguacate..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="h-44 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredCatalog.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        No se encontró &ldquo;{searchQuery}&rdquo; en el catálogo.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setManualName(searchQuery);
                          setEntryMode('manual');
                        }}
                        className="text-xs font-medium text-teal-700 hover:underline cursor-pointer"
                      >
                        Agregar &ldquo;{searchQuery}&rdquo; como plato manual
                      </button>
                    </div>
                  ) : (
                    filteredCatalog.map((food) => {
                      const isSelected = activeFood?.id === food.id;
                      return (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => handleSelectFood(food)}
                          className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50/80 text-slate-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {food.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {food.group} · {food.servingLabel} ({food.servingGrams} g)
                            </p>
                          </div>
                          <div className="text-right shrink-0 font-mono text-xs tabular-nums">
                            <p className="font-semibold text-slate-900">
                              {food.caloriesPer100g} kcal
                            </p>
                            <p className="text-slate-400">por 100g</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Configuración de porción, comida y vista previa de macros */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Momento del día */}
                  <div>
                    <span className="block text-xs font-medium text-slate-700 mb-1.5">
                      2. Momento del día
                    </span>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-lg">
                      {MEAL_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cantidad en gramos + atajos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="grams-input"
                        className="text-xs font-medium text-slate-700"
                      >
                        3. Cantidad consumida (gramos)
                      </label>
                      {activeFood && (
                        <span className="text-xs text-slate-500">
                          Sugerido: {activeFood.servingLabel} ({activeFood.servingGrams} g)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id="grams-input"
                        type="number"
                        min="1"
                        max="3000"
                        value={gramsInput}
                        onChange={(e) =>
                          setGramsInput(Math.max(0, Number(e.target.value)))
                        }
                        className="w-28 px-3 py-2 text-sm font-mono font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 tabular-nums"
                      />
                      {activeFood && (
                        <button
                          type="button"
                          onClick={() => setGramsInput(activeFood.servingGrams)}
                          className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          1 porción ({activeFood.servingGrams}g)
                        </button>
                      )}
                      {[50, 100, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setGramsInput(preset)}
                          className="px-2.5 py-2 text-xs font-mono text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap tabular-nums cursor-pointer"
                        >
                          {preset}g
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vista previa nutricional exacta + Botón Agregar */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 truncate max-w-xs">
                      {activeFood ? activeFood.name : 'Selecciona un alimento'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums">
                      <span className="text-sm font-bold text-slate-900">
                        {previewCalories} kcal
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-700">Carb: {previewCarbs}g</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-700">Prot: {previewProtein}g</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-700">Grasas: {previewFat}g</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!activeFood || gramsInput <= 0}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar comida</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          /* Modo Manual / Plato Personalizado */
          <form onSubmit={handleAddManualMeal} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre de la comida o plato
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ej. Bowl casero de pollo, arroz y palta"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Momento del día
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-lg">
                  {MEAL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Peso aproximado (g)
                </label>
                <input
                  type="number"
                  min="1"
                  max="3000"
                  value={manualGrams}
                  onChange={(e) => setManualGrams(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Calorías (kcal)
                  </label>
                  <button
                    type="button"
                    onClick={handleCalculateManualKcalFromMacros}
                    className="text-[11px] text-teal-700 hover:underline cursor-pointer"
                  >
                    Calcular auto
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-semibold bg-white border border-slate-300 rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Carbohidratos (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="600"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Proteínas (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="400"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Grasas (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="300"
                  value={manualFat}
                  onChange={(e) => setManualFat(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToCatalog}
                  onChange={(e) => setSaveToCatalog(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>Guardar también en mi catálogo de alimentos para próximos días</span>
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar plato manual</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Barra de filtros por comida y resumen por momento del día */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveFilter('TODAS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeFilter === 'TODAS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({mealsForDay.length})
          </button>
          {MEAL_CATEGORIES.map((cat) => {
            const count = mealsForDay.filter((m) => m.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono tabular-nums">
          {categorySubtotals.map((sub, idx) => (
            <React.Fragment key={sub.category}>
              {idx > 0 && <span aria-hidden="true">·</span>}
              <span>
                {sub.category}: <strong className="text-slate-700 font-medium">{sub.kcal} kcal</strong>
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tabla de alta densidad de comidas registradas */}
      {displayedMeals.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800">
            No hay comidas registradas {activeFilter !== 'TODAS' ? `en ${activeFilter.toLowerCase()}` : 'para esta fecha'}.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Usa el buscador superior para elegir alimentos del catálogo o ingresa un plato personalizado y calcular tus calorías y macronutrientes del día.
          </p>
          <button
            type="button"
            onClick={() => foodSearchInputRef.current?.focus()}
            className="mt-1 inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Registrar primera comida
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/50">
                <th className="py-3 pl-6 pr-4">Alimento / Comida</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Porción</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Calorías</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Carbohidratos</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Proteínas</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Grasas</th>
                <th className="py-3 pl-4 pr-6 text-right whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {displayedMeals.map((meal) => (
                <tr
                  key={meal.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3 pl-6 pr-4">
                    <p className="font-medium text-slate-900">{meal.name}</p>
                    <p className="text-xs text-slate-500">
                      {meal.category} · {meal.grams} g
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1 font-mono text-xs tabular-nums">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateMealGrams(meal.id, Math.max(10, meal.grams - 25))
                        }
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
                        title="Restar 25g"
                        aria-label={`Restar 25 gramos a ${meal.name}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-14 text-center text-slate-700 font-medium">
                        {meal.grams} g
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateMealGrams(meal.id, meal.grams + 25)}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors cursor-pointer"
                        title="Sumar 25g"
                        aria-label={`Sumar 25 gramos a ${meal.name}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {meal.calories} kcal
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                    {meal.carbs} g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                    {meal.protein} g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                    {meal.fat} g
                  </td>
                  <td className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onDeleteMeal(meal.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      aria-label={`Eliminar ${meal.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-mono text-xs sm:text-sm font-semibold text-slate-900 tabular-nums">
                <td className="py-3.5 pl-6 pr-4 font-sans">
                  Total {activeFilter === 'TODAS' ? 'diario consumido' : activeFilter.toLowerCase()}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-500">
                  {displayedMeals.reduce((s, m) => s + m.grams, 0)} g
                </td>
                <td className="py-3.5 px-4 text-right text-slate-900">
                  {filteredTotals.calories.toLocaleString('es-ES')} kcal
                </td>
                <td className="py-3.5 px-4 text-right text-amber-800">
                  {filteredTotals.carbs} g
                </td>
                <td className="py-3.5 px-4 text-right text-teal-800">
                  {filteredTotals.protein} g
                </td>
                <td className="py-3.5 px-4 text-right text-slate-800">
                  {filteredTotals.fat} g
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
