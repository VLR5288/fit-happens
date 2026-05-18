import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface FoodAnalysisResult {
  foods: Array<{
    name: string;
    estimated_portion: string;
    calories: number;
    protein_g: number;
    fibre_g: number;
    carbs_g: number;
    fat_g: number;
  }>;
  total_calories: number;
  total_protein_g: number;
  total_fibre_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  prep_method: string;
  suggestion: string;
}

export async function analyzeFoodPhoto(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  userProfile?: { calorie_target?: number | null; protein_target_g?: number | null }
): Promise<FoodAnalysisResult> {
  const contextNote = userProfile?.calorie_target
    ? `The user's daily calorie target is ${userProfile.calorie_target} kcal and protein target is ${userProfile.protein_target_g}g.`
    : "";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `Analyse this meal photo and return a JSON object with nutritional estimates. ${contextNote}

Return ONLY valid JSON matching this exact structure:
{
  "foods": [
    {
      "name": "food item name",
      "estimated_portion": "e.g. 150g or 1 cup",
      "calories": 0,
      "protein_g": 0,
      "fibre_g": 0,
      "carbs_g": 0,
      "fat_g": 0
    }
  ],
  "total_calories": 0,
  "total_protein_g": 0,
  "total_fibre_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "prep_method": "describe cooking method e.g. grilled, steamed, fried",
  "suggestion": "one actionable tip to improve the meal's nutritional balance"
}`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");

  return JSON.parse(jsonMatch[0]) as FoodAnalysisResult;
}

export async function analyzeFoodText(
  description: string,
  userProfile?: { calorie_target?: number | null; protein_target_g?: number | null }
): Promise<FoodAnalysisResult> {
  const contextNote = userProfile?.calorie_target
    ? `The user's daily calorie target is ${userProfile.calorie_target} kcal and protein target is ${userProfile.protein_target_g}g.`
    : "";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Estimate the macros for this food item: "${description}". ${contextNote}

Return ONLY valid JSON matching this exact structure:
{
  "foods": [
    {
      "name": "food item name",
      "estimated_portion": "e.g. 150g or 1 cup",
      "calories": 0,
      "protein_g": 0,
      "fibre_g": 0,
      "carbs_g": 0,
      "fat_g": 0
    }
  ],
  "total_calories": 0,
  "total_protein_g": 0,
  "total_fibre_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "prep_method": "describe preparation method if relevant, otherwise 'n/a'",
  "suggestion": "one actionable tip to improve the meal's nutritional balance"
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");

  return JSON.parse(jsonMatch[0]) as FoodAnalysisResult;
}

export async function getDailySuggestion(summary: {
  calories_consumed: number;
  calorie_target: number;
  protein_g: number;
  protein_target_g: number;
  water_ml: number;
  water_target_ml: number;
  activity_minutes: number;
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Given today's health stats, give one short, friendly, motivating suggestion (2-3 sentences max):
- Calories: ${summary.calories_consumed} / ${summary.calorie_target} kcal
- Protein: ${summary.protein_g}g / ${summary.protein_target_g}g
- Water: ${summary.water_ml}ml / ${summary.water_target_ml}ml
- Activity: ${summary.activity_minutes} minutes

Keep it positive and specific to what's been logged.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return "";
  return content.text;
}
