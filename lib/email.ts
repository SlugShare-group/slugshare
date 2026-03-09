import nodemailer from "nodemailer";

type RequestEmailContext = {
  requesterEmail: string;
  requesterName?: string | null;
  donorEmail: string;
  donorName?: string | null;
  location: string;
  pointsRequested: number;
  mode: "in_person" | "qr_code" | "completed";
};

function getTransport() {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = process.env.EMAIL_SMTP_PORT
    ? Number(process.env.EMAIL_SMTP_PORT)
    : undefined;
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  if (!host || !port || !user || !pass) {
    // In development or when email is not configured, just no-op.
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendRequestAcceptedEmail(ctx: RequestEmailContext) {
  const transport = getTransport();
  if (!transport) {
    console.log("[email] Skipping email send, SMTP not configured", {
      to: ctx.requesterEmail,
      location: ctx.location,
      pointsRequested: ctx.pointsRequested,
      mode: ctx.mode,
    });
    return;
  }

  const from = process.env.EMAIL_FROM || ctx.donorEmail;

  const requesterName = ctx.requesterName || ctx.requesterEmail;
  const donorName = ctx.donorName || ctx.donorEmail;

  let subject: string;
  let text: string;

  if (ctx.mode === "qr_code") {
    subject = `Your QR request was accepted for ${ctx.pointsRequested} points`;
    text = [
      `Hi ${requesterName},`,
      "",
      `${donorName} accepted your QR request for ${ctx.pointsRequested} points at ${ctx.location}.`,
      "Open SlugShare and go to the Scan screen to redeem this request.",
      "",
      "Thanks,",
      "SlugShare",
    ].join("\n");
  } else if (ctx.mode === "in_person") {
    subject = `Your request was accepted for ${ctx.pointsRequested} points`;
    text = [
      `Hi ${requesterName},`,
      "",
      `${donorName} accepted your request for ${ctx.pointsRequested} points at ${ctx.location}.`,
      "You can meet in person to complete the transfer.",
      "",
      "Thanks,",
      "SlugShare",
    ].join("\n");
  } else {
    subject = `Your request was completed for ${ctx.pointsRequested} points`;
    text = [
      `Hi ${requesterName},`,
      "",
      `${donorName} completed your request for ${ctx.pointsRequested} points at ${ctx.location}.`,
      "",
      "Thanks,",
      "SlugShare",
    ].join("\n");
  }

  await transport.sendMail({
    from,
    to: ctx.requesterEmail,
    subject,
    text,
  });
}

