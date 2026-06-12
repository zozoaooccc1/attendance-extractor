import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ONESIGNAL_APP_ID = (process.env["ONESIGNAL_APP_ID"] ?? "").trim().replace(/^["']|["']$/g, "");
const ONESIGNAL_REST_API_KEY = (process.env["ONESIGNAL_REST_API_KEY"] ?? "").trim().replace(/^["']|["']$/g, "");
const NOTIFY_SECRET = (process.env["NOTIFY_SECRET"] ?? "").trim().replace(/^["']|["']$/g, "");

async function sendOneSignalNotification(title: string, body: string, url?: string): Promise<void> {
  const payload: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["All"],
    headings: { ar: title, en: title },
    contents: { ar: body, en: body },
    priority: 10,
  };

  if (url) {
    payload["url"] = url;
  }

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(`OneSignal error: ${JSON.stringify(data)}`);
  }

  logger.info({ recipients: data["recipients"], id: data["id"] }, "OneSignal notification sent");
}

// ── EAS Webhook — يستقبل إشعار اكتمال البناء من Expo ──────────────────────
router.post("/notify/eas-webhook", async (req: Request, res: Response) => {
  const secret = req.headers["x-notify-secret"] as string | undefined;

  if (!NOTIFY_SECRET || secret !== NOTIFY_SECRET) {
    req.log.warn("Unauthorized webhook attempt");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  req.log.info({ body }, "EAS webhook received");

  const status = body["status"] as string | undefined;
  const appVersion = body["metadata"] as Record<string, unknown> | undefined;
  const version = (appVersion?.["appVersion"] as string) ?? body["appVersion"] as string ?? "جديد";
  const platform = body["platform"] as string ?? "android";
  const downloadUrl = body["artifacts"] as string | undefined;

  if (status !== "finished") {
    res.json({ ok: true, message: "Build not finished yet, skipping notification" });
    return;
  }

  if (platform?.toLowerCase() !== "android") {
    res.json({ ok: true, message: "Non-android build, skipping" });
    return;
  }

  try {
    await sendOneSignalNotification(
      `🚀 تحديث جديد — الإصدار ${version}`,
      "افتح التطبيق لتثبيت التحديث والاستمتاع بالميزات الجديدة!",
      downloadUrl as string | undefined,
    );
    res.json({ ok: true, message: "Notification sent to all users" });
  } catch (err) {
    req.log.error({ err }, "Failed to send OneSignal notification");
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// ── Endpoint يدوي لإرسال إشعار مخصص ──────────────────────────────────────
router.post("/notify/send", async (req: Request, res: Response) => {
  const secret = req.headers["x-notify-secret"] as string | undefined;

  if (!NOTIFY_SECRET || secret !== NOTIFY_SECRET) {
    req.log.warn("Unauthorized manual notify attempt");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { title, body, url } = req.body as { title: string; body: string; url?: string };

  if (!title || !body) {
    res.status(400).json({ error: "title and body are required" });
    return;
  }

  try {
    await sendOneSignalNotification(title, body, url);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to send manual notification");
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;
