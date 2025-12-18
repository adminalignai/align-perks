export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { addContactNote, addContactTag, updateContactCustomField } from "@/lib/ghl";
import prisma from "@/lib/prisma";

type RedemptionItemSnapshot = {
  rewardItemId: string;
  name: string;
  pointsEach: number;
  qty: number;
  pointsTotal: number;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function parseItems(items: unknown): RedemptionItemSnapshot[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        "rewardItemId" in item &&
        "name" in item &&
        "pointsEach" in item &&
        "qty" in item &&
        "pointsTotal" in item
      ) {
        const typedItem = item as Record<string, unknown>;

        if (
          typeof typedItem.rewardItemId === "string" &&
          typeof typedItem.name === "string" &&
          typeof typedItem.pointsEach === "number" &&
          typeof typedItem.qty === "number" &&
          typeof typedItem.pointsTotal === "number"
        ) {
          return {
            rewardItemId: typedItem.rewardItemId,
            name: typedItem.name,
            pointsEach: typedItem.pointsEach,
            qty: typedItem.qty,
            pointsTotal: typedItem.pointsTotal,
          } satisfies RedemptionItemSnapshot;
        }
      }
      return null;
    })
    .filter((item): item is RedemptionItemSnapshot => Boolean(item));
}

async function getAuthorizedRedemption(token: string, userId: string) {
  const redemption = await prisma.redemptionIntent.findUnique({
    where: { token },
    include: {
      enrollment: {
        select: {
          id: true,
          cachedPoints: true,
          locationId: true,
          customer: { select: { firstName: true, lastName: true } },
          location: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!redemption || redemption.usedAt) {
    throw new ApiError("Invalid or expired token", 400);
  }

  const access = await prisma.userLocation.findUnique({
    where: {
      userId_locationId: {
        userId,
        locationId: redemption.enrollment.locationId,
      },
    },
    select: { id: true },
  });

  if (!access) {
    throw new ApiError("Forbidden", 403);
  }

  return redemption;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const redemption = await getAuthorizedRedemption(token, session.userId);
    const items = parseItems(redemption.items);
    const primaryItem = items[0];
    const customerName = `${redemption.enrollment.customer.firstName} ${redemption.enrollment.customer.lastName}`.trim();

    return NextResponse.json({
      redemptionIntentId: redemption.id,
      customerName,
      rewardName: primaryItem?.name ?? "Reward",
      pointsSpent: redemption.pointsSpent,
      items,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to validate redemption token", error);
    return NextResponse.json({ error: "Unable to validate token" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.GHL_PRIVATE_TOKEN;
  const pointsFieldId = process.env.GHL_POINTS_FIELD_ID;

  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim() || request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const { redemption, items } = await prisma.$transaction(async (tx) => {
      const redemption = await tx.redemptionIntent.findUnique({
        where: { token },
        include: {
          enrollment: {
            select: {
              id: true,
              cachedPoints: true,
              locationId: true,
              ghlContactId: true,
              customer: { select: { firstName: true, lastName: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!redemption || redemption.usedAt) {
        throw new ApiError("Invalid or expired token", 400);
      }

      const access = await tx.userLocation.findUnique({
        where: {
          userId_locationId: {
            userId: session.userId,
            locationId: redemption.enrollment.locationId,
          },
        },
        select: { id: true },
      });

      if (!access) {
        throw new ApiError("Forbidden", 403);
      }

      if (redemption.enrollment.cachedPoints < redemption.pointsSpent) {
        throw new ApiError("Insufficient points to redeem", 400);
      }

      await tx.enrollment.update({
        where: { id: redemption.enrollmentId },
        data: { cachedPoints: { decrement: redemption.pointsSpent } },
      });

      await tx.redemptionIntent.update({
        where: { id: redemption.id },
        data: { usedAt: new Date() },
      });

      return { redemption, items: parseItems(redemption.items) };
    });

    const customerName = `${redemption.enrollment.customer.firstName} ${redemption.enrollment.customer.lastName}`.trim();
    const rewardName = items[0]?.name ?? "Reward";
    const quantity = items[0]?.qty ?? 1;
    const newBalance = redemption.enrollment.cachedPoints - redemption.pointsSpent;

    if (accessToken && pointsFieldId && redemption.enrollment.ghlContactId) {
      try {
        await updateContactCustomField(accessToken, redemption.enrollment.ghlContactId, pointsFieldId, newBalance);
        await addContactNote(
          accessToken,
          redemption.enrollment.ghlContactId,
          `Redeemed ${quantity} of ${rewardName} for ${redemption.pointsSpent} points.`,
        );
        await addContactTag(accessToken, redemption.enrollment.ghlContactId, ["loyalty-redeemed-reward"]);
      } catch (error) {
        console.error("Failed to sync redemption to GHL", error);
      }
    } else {
      console.error("Missing GHL configuration or contact ID; skipping GHL sync for redemption");
    }

    return NextResponse.json({ success: true, customerName, rewardName });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to complete redemption", error);
    return NextResponse.json({ error: "Unable to complete redemption" }, { status: 500 });
  }
}
