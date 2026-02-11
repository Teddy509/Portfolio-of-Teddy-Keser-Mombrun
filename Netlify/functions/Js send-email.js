const corsHeaders = {
  "Access-Control-Allow-Origin": "https://teddy509.github.io",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};


exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  // Only POST
  if (event.httpMethod !== "POST") {
     return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { name, email, message, website } = JSON.parse(event.body || "{}");

    // Honeypot check (spam)
    if (website && website.length > 0) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    }

    // Validate
    if (!name || !email || !message) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing fields" }) };
    }

    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Server is missing API key" }) };
    }

    // Teacher: change these
    const TO_EMAIL = "teddyconcept1@gmail.com";     // example: teacher@school.org
    const FROM_EMAIL = "teddyconcept1@gmail.com"; // must be allowed in Elastic Email

    if (!TO_EMAIL || !FROM_EMAIL) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Server is missing TO/FROM email" }) };
    }

    const subject = `New contact form message from ${name}`;
    const htmlContent = `
      <h2>New message</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `;

    // Elastic Email API v4 transactional endpoint
    const eeRes = await fetch("https://api.elasticemail.com/v4/emails/transactional", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ElasticEmail-ApiKey": apiKey
      },
      body: JSON.stringify({
        Recipients: { To: [TO_EMAIL] },
        Content: {
          From: FROM_EMAIL,
          Subject: subject,
          Body: [
            { ContentType: "HTML", Content: htmlContent }
          ]
        }
      })
    });

    const eeData = await eeRes.json().catch(() => ({}));

    if (!eeRes.ok) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Email service error", details: eeData })
      };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Server error" }) };
  }
};

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
