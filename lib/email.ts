import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface StandOrderEmailParams {
  restaurantName: string;
  quantity: number;
  total: number;
  message?: string;
  ownerEmail: string;
  logoUrl?: string | null;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export async function sendStandOrderEmail({
  restaurantName,
  quantity,
  total,
  message,
  ownerEmail,
  logoUrl,
}: StandOrderEmailParams) {
  const orderMessage = message?.trim() || "No message provided.";
  const logoMarkup = logoUrl
    ? `<a href="${logoUrl}" style="color:#2563EB;">${logoUrl}</a>`
    : "Not provided.";

  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">New Stand Order</h2>
      <p style="margin-top: 0; margin-bottom: 16px;">Fulfill this order ASAP.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; min-width: 360px;">
        <tr>
          <td style="font-weight: 600; background: #F3F4F6; border: 1px solid #E5E7EB;">Restaurant Name</td>
          <td style="border: 1px solid #E5E7EB;">${restaurantName}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; background: #F3F4F6; border: 1px solid #E5E7EB;">Owner Email</td>
          <td style="border: 1px solid #E5E7EB;">${ownerEmail}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; background: #F3F4F6; border: 1px solid #E5E7EB;">Quantity</td>
          <td style="border: 1px solid #E5E7EB;">${quantity}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; background: #F3F4F6; border: 1px solid #E5E7EB;">Total Price</td>
          <td style="border: 1px solid #E5E7EB;">${formatCurrency(total)}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; background: #F3F4F6; border: 1px solid #E5E7EB;">Custom Message</td>
          <td style="border: 1px solid #E5E7EB;">${orderMessage}</td>
        </tr>
        <tr>
          <td style="font-weight: 600; background: #F3F4F6; border: 1px solid #E5E7EB;">Logo URL</td>
          <td style="border: 1px solid #E5E7EB;">${logoMarkup}</td>
        </tr>
      </table>
    </div>
  `;

  await resend.emails.send({
    from: "Align Perks <onboarding@resend.dev>",
    to: "admin@getalign.ai",
    subject: `[New Order] ${restaurantName} ordered ${quantity} stands.`,
    html,
  });
}
