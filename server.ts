import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY no está configurada. Verifica la clave en el panel Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface GeneratePlanPayload {
  currentWeightKg: number;
  targetWeightKg: number;
  mealsPerDayCount: number;
  registeredMealsSample: string[];
  targetCalories: number;
  targetCarbs: number;
  targetFat: number;
  targetProtein: number;
  dietaryStyle?: string;
  additionalNotes?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/meal-plan/generate', async (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<GeneratePlanPayload>;

      const currentWeightKg = Number(body.currentWeightKg) || 75;
      const targetWeightKg = Number(body.targetWeightKg) || 70;
      const mealsPerDayCount = Math.min(
        6,
        Math.max(2, Number(body.mealsPerDayCount) || 4)
      );
      const targetCalories = Math.max(1000, Math.round(Number(body.targetCalories) || 2000));
      const targetCarbs = Math.max(20, Math.round(Number(body.targetCarbs) || 220));
      const targetFat = Math.max(20, Math.round(Number(body.targetFat) || 65));
      const targetProtein = Math.max(40, Math.round(Number(body.targetProtein) || 140));
      const dietaryStyle = String(body.dietaryStyle || 'Equilibrada tradicional').slice(0, 120);
      const additionalNotes = String(body.additionalNotes || '').slice(0, 300);
      const registeredMealsSample = Array.isArray(body.registeredMealsSample)
        ? body.registeredMealsSample.slice(0, 12).map((s) => String(s))
        : [];

      const habitsContext =
        registeredMealsSample.length > 0
          ? `Alimentos y comidas registradas habitualmente por el usuario: ${registeredMealsSample.join(', ')}.`
          : 'El usuario aún no tiene un historial amplio, utiliza alimentos frescos, accesibles y variados.';

      const prompt = `Genera un plan de comidas personalizado completo para una semana (7 días: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado y Domingo) en español.

Datos del usuario y objetivos nutricionales diarios estrictos:
- Peso actual: ${currentWeightKg} kg
- Peso objetivo: ${targetWeightKg} kg
- Número de comidas al día: ${mealsPerDayCount} comidas diarias (usa categorías válidas exclusivamente entre: "Desayuno", "Almuerzo", "Cena", "Snack")
- ${habitsContext}
- Preferencia alimentaria: ${dietaryStyle}
${additionalNotes ? `- Indicaciones adicionales: ${additionalNotes}` : ''}

Objetivo nutricional diario que CADA DÍA debe alcanzar con alta precisión (±3% de margen máximo):
- Calorías diarias objetivo: ${targetCalories} kcal
- Carbohidratos diarios objetivo: ${targetCarbs} g
- Grasas diarias objetivo: ${targetFat} g
- Proteínas diarias objetivo: ${targetProtein} g

Instrucciones obligatorias:
1. Cada uno de los 7 días debe tener exactamente ${mealsPerDayCount} comidas.
2. En cada comida incluye su nombre claro, el detalle concreto de ingredientes con cantidades en gramos en "ingredientsSummary" (por ejemplo: "150g pechuga de pollo, 160g arroz integral cocido, 80g aguacate"), el peso total aproximado en gramos ("grams"), y el desglose exacto de "calories", "carbs", "protein" y "fat".
3. Verifica matemáticamente que en cada día la suma de las ${mealsPerDayCount} comidas se acerque rigurosamente a ${targetCalories} kcal, ${targetCarbs}g de carbohidratos, ${targetFat}g de grasas y ${targetProtein}g de proteínas, manteniendo coherencia calórica (4 kcal/g carbohidratos, 4 kcal/g proteínas, 9 kcal/g grasas).
4. Varía las recetas a lo largo de la semana incorporando afinidad con las comidas que el usuario ya consume.`;

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un nutricionista clínico deportivo especialista en planificación dietética cuantitativa. Respondes únicamente con JSON válido siguiendo el esquema proporcionado y garantizando exactitud aritmética en calorías y macronutrientes.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              days: {
                type: Type.ARRAY,
                description: 'Lista de los 7 días de la semana de Lunes a Domingo.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayName: {
                      type: Type.STRING,
                      description: 'Nombre del día (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo).',
                    },
                    focusNote: {
                      type: Type.STRING,
                      description: 'Breve enfoque nutricional del día en una frase corta.',
                    },
                    meals: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          category: {
                            type: Type.STRING,
                            description: 'Debe ser uno de: Desayuno, Almuerzo, Cena, Snack',
                          },
                          name: {
                            type: Type.STRING,
                            description: 'Nombre del plato o comida.',
                          },
                          ingredientsSummary: {
                            type: Type.STRING,
                            description: 'Ingredientes principales con gramos exactos.',
                          },
                          grams: {
                            type: Type.INTEGER,
                            description: 'Peso total estimado de la comida en gramos.',
                          },
                          calories: {
                            type: Type.INTEGER,
                            description: 'Calorías totales de esta comida (kcal).',
                          },
                          carbs: {
                            type: Type.NUMBER,
                            description: 'Carbohidratos de esta comida en gramos.',
                          },
                          protein: {
                            type: Type.NUMBER,
                            description: 'Proteínas de esta comida en gramos.',
                          },
                          fat: {
                            type: Type.NUMBER,
                            description: 'Grasas de esta comida en gramos.',
                          },
                        },
                        required: [
                          'category',
                          'name',
                          'ingredientsSummary',
                          'grams',
                          'calories',
                          'carbs',
                          'protein',
                          'fat',
                        ],
                      },
                    },
                  },
                  required: ['dayName', 'focusNote', 'meals'],
                },
              },
            },
            required: ['days'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({
          error: 'El modelo no devolvió contenido para el plan semanal. Intenta nuevamente.',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        days: Array<{
          dayName: string;
          focusNote: string;
          meals: Array<{
            category: string;
            name: string;
            ingredientsSummary: string;
            grams: number;
            calories: number;
            carbs: number;
            protein: number;
            fat: number;
          }>;
        }>;
      };

      const validCategories = new Set(['Desayuno', 'Almuerzo', 'Cena', 'Snack']);

      const normalizedDays = (parsed.days || []).map((day) => {
        const meals = (day.meals || []).map((m) => {
          const normalizedCategory = validCategories.has(m.category)
            ? m.category
            : 'Almuerzo';
          const carbs = Math.round((Number(m.carbs) || 0) * 10) / 10;
          const protein = Math.round((Number(m.protein) || 0) * 10) / 10;
          const fat = Math.round((Number(m.fat) || 0) * 10) / 10;
          const calories = Math.round(Number(m.calories) || carbs * 4 + protein * 4 + fat * 9);
          const grams = Math.max(30, Math.round(Number(m.grams) || 250));

          return {
            category: normalizedCategory,
            name: String(m.name || 'Comida planificada'),
            ingredientsSummary: String(m.ingredientsSummary || ''),
            grams,
            calories,
            carbs,
            protein,
            fat,
          };
        });

        const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
        const totalCarbs =
          Math.round(meals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10;
        const totalProtein =
          Math.round(meals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
        const totalFat =
          Math.round(meals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10;

        return {
          dayName: day.dayName,
          focusNote: day.focusNote,
          meals,
          totalCalories,
          totalCarbs,
          totalProtein,
          totalFat,
        };
      });

      res.json({
        generatedAt: new Date().toISOString(),
        targetWeightKg,
        mealsPerDayCount,
        targetCalories,
        targetCarbs,
        targetProtein,
        targetFat,
        dietaryStyle,
        days: normalizedDays,
      });
    } catch (err: unknown) {
      console.error('Error generating weekly meal plan:', err);
      const message = err instanceof Error ? err.message : String(err);

      if (
        message.includes('PERMISSION_DENIED') ||
        message.includes('API_KEY_INVALID') ||
        message.includes('403')
      ) {
        res.status(403).json({
          error:
            'No se pudo autenticar con Gemini API. Verifica tu clave API en el panel Settings > Secrets.',
        });
        return;
      }

      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        res.status(429).json({
          error:
            'Se alcanzó el límite de cuota temporal de la API. Espera unos segundos o configura una clave con facturación en Settings > Secrets.',
        });
        return;
      }

      res.status(500).json({
        error: `No fue posible generar el plan semanal: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NutriBalance server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
