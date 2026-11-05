import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { enquiries } from "@/db/schema";

const enquirySchema = z.object({
  name: z.string().min(2, "नाव किमान २ अक्षरे असावे").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "कृपया अचूक १० अंकी मोबाईल नंबर टाका"),
  product: z.string().min(1, "धान्य निवडा"),
  message: z.string().max(1000).optional().default(""),
  honeypot: z.string().max(0, "Spam detected").optional().default(""),
});

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local_client";
    const now = Date.now();

    // Rate limiting: 5 submissions per 10 minutes per IP
    const record = rateLimitMap.get(ip);
    if (record) {
      if (now - record.timestamp < 10 * 60 * 1000) {
        if (record.count >= 5) {
          return NextResponse.json(
            { error: "Too many enquiries. Please wait 10 minutes." },
            { status: 429 }
          );
        }
        record.count++;
      } else {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }

    const body = await request.json();
    const validated = enquirySchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, phone, product, message, honeypot } = validated.data;
    if (honeypot && honeypot.length > 0) {
      return NextResponse.json({ error: "Spam detected" }, { status: 400 });
    }

    // Insert into database
    try {
      await db.insert(enquiries).values({
        name,
        phone,
        product,
        message,
        status: "new",
      });
    } catch (dbErr) {
      console.error("DB insert enquiry error:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "चौकशी नोंदवली गेली आहे. आम्ही लवकरच संपर्क करू.",
    });
  } catch (error) {
    console.error("Enquiry API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
