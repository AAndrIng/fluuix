import type { Activity, AutomationMode } from "../treasury-automation";

type Prediction = { thresholdHundredths: number; basis: "traffic" | "sales" | "both" };

export async function predictThreshold(activity: Activity, balance: string, mode: AutomationMode = "normal"): Promise<Prediction | null> {
  const trafficUp = activity.traffic > activity.usualTraffic;
  const salesUp = activity.sales > activity.usualSales;
  if (mode === "demo") return trafficUp && salesUp ? { thresholdHundredths: 75, basis: "both" } : null;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6500),
      body: JSON.stringify({
        model: "gpt-5-mini", reasoning: { effort: "minimal" }, store: false, max_output_tokens: 250,
        instructions: "Estimá un umbral preventivo de liquidez en centésimos de mARGt (entero de 25 a 100). El piso fijo es 25. Ante una suba del 30–40% de ventas y tráfico en simultáneo, el umbral de referencia es 75. Con señales más leves acercate al piso. Elegí como basis la señal que justifica tu estimación. Solo estimás el umbral, no decidís el monto ni la cuenta de origen.",
        input: JSON.stringify({ activity, balanceInBaseUnits: balance, decimals: 18 }),
        text: { format: { type: "json_schema", name: "treasury_threshold", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["thresholdHundredths", "basis"],
          properties: { thresholdHundredths: { type: "integer" }, basis: { type: "string", enum: ["traffic", "sales", "both"] } },
        } } },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { output?: { content?: { type: string; text?: string }[] }[] };
    const text = data.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text")?.text;
    if (!text) return null;
    const value = JSON.parse(text) as Prediction;
    if (!Number.isInteger(value.thresholdHundredths) || value.thresholdHundredths < 25 || value.thresholdHundredths > 100) return null;
    if ((value.basis === "traffic" && trafficUp) || (value.basis === "sales" && salesUp) || (value.basis === "both" && trafficUp && salesUp)) return value;
    return null;
  } catch {
    return null;
  }
}
