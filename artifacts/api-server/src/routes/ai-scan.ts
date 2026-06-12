import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── نقطة الكشّاف الذكي — تستخرج الوقت من صورة بصمة الحضور ──────────────────
router.post("/ai-scan", async (req: Request, res: Response) => {
  const { imageBase64 } = req.body as { imageBase64?: string };

  if (!imageBase64 || imageBase64.length < 100) {
    res.status(400).json({ error: "imageBase64 مطلوب" });
    return;
  }

  const GEMINI_KEY = process.env["GEMINI_API_KEY"] ?? "";

  if (!GEMINI_KEY) {
    res.status(503).json({
      error: "GEMINI_API_KEY غير مُعيَّن في الخادم — يرجى إضافة المفتاح في الإعدادات",
    });
    return;
  }

  try {
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `أنت نظام استخراج وقت من صور أجهزة البصمة.
مهمتك: ابحث في هذه الصورة عن الوقت المعروض على شاشة جهاز البصمة.
استجب بهذا التنسيق فقط (JSON):
{"time": "HH:MM", "confidence": 0-100}
حيث HH:MM بصيغة 24 ساعة.
إذا لم تجد وقتاً واضحاً: {"time": null, "confidence": 0}
لا تُضف أي نص آخر.`,
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 64,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      logger.warn({ status: geminiRes.status, body: errBody }, "Gemini API error");
      res.status(502).json({ error: `خطأ من Gemini: ${geminiRes.status}` });
      return;
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    logger.info({ rawText }, "Gemini AI scan response");

    const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      res.status(200).json({ time: null, error: "لم يُعيد Gemini نتيجة مفهومة" });
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]) as { time?: string | null; confidence?: number };

    const timeStr = parsed.time ?? null;
    if (timeStr && !/^\d{1,2}:\d{2}$/.test(timeStr)) {
      res.status(200).json({ time: null, error: "صيغة الوقت غير صحيحة" });
      return;
    }

    res.status(200).json({
      time: timeStr,
      confidence: parsed.confidence ?? (timeStr ? 85 : 0),
    });
  } catch (err) {
    logger.error({ err }, "AI scan error");
    res.status(500).json({ error: "خطأ داخلي في الخادم" });
  }
});

export default router;
