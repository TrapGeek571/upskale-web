const crypto = require("crypto");

const {
  ZOOM_API_KEY,
  ZOOM_API_SECRET,
  ZOOM_JWT_TOKEN,
  ZOOM_SECRET_TOKEN,
  ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET,
  ZOOM_ACCOUNT_ID,
  ZOOM_USER_ID = "me",
} = process.env;

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateJwt() {
  if (!ZOOM_API_KEY || !ZOOM_API_SECRET) {
    throw new Error(
      "ZOOM_API_KEY and ZOOM_API_SECRET must be set to create a Zoom meeting.",
    );
  }

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: ZOOM_API_KEY,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  const signature = crypto
    .createHmac("sha256", ZOOM_API_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${header}.${payload}.${signature}`;
}

function getCandidateTokens() {
  const candidates = [];

  if (ZOOM_SECRET_TOKEN) {
    candidates.push({
      name: "ZOOM_SECRET_TOKEN",
      getToken: async () => ZOOM_SECRET_TOKEN,
    });
  }

  if (ZOOM_CLIENT_ID && ZOOM_CLIENT_SECRET && ZOOM_ACCOUNT_ID) {
    candidates.push({
      name: "server_to_server",
      getToken: async () => {
        const auth = Buffer.from(
          `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`,
        ).toString("base64");
        const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
          ZOOM_ACCOUNT_ID,
        )}`;

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(
            data.error || data.message || "Failed to get Zoom token",
          );
        }
        return data.access_token;
      },
    });
  }

  if (ZOOM_JWT_TOKEN) {
    candidates.push({
      name: "ZOOM_JWT_TOKEN",
      getToken: async () => ZOOM_JWT_TOKEN,
    });
  }

  if (ZOOM_API_KEY && ZOOM_API_SECRET) {
    candidates.push({
      name: "ZOOM_API_KEY_SECRET",
      getToken: async () => generateJwt(),
    });
  }

  return candidates;
}

async function createZoomMeeting({
  topic = "Upskale Session",
  durationMinutes = 60,
  timezone = "Africa/Nairobi",
} = {}) {
  const candidates = getCandidateTokens();
  if (candidates.length === 0) {
    return {
      join_url: null,
      meetingId: null,
      start_time: null,
      duration: durationMinutes,
      topic,
      error:
        "No Zoom credentials available. Provide ZOOM_SECRET_TOKEN, server-to-server OAuth variables, JWT token, or API key/secret.",
    };
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const token = await candidate.getToken();
      if (!token) {
        throw new Error(`Empty token from ${candidate.name}`);
      }

      const response = await fetch(
        `https://api.zoom.us/v2/users/${encodeURIComponent(ZOOM_USER_ID)}/meetings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            type: 2,
            start_time: new Date().toISOString(),
            duration: durationMinutes,
            timezone,
            settings: {
              join_before_host: true,
              approval_type: 2,
              waiting_room: false,
            },
          }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        return {
          join_url: data.join_url,
          meetingId: data.id?.toString(),
          start_time: data.start_time,
          duration: data.duration,
          topic: data.topic,
        };
      }

      const message = data.message || data.error || JSON.stringify(data);
      lastError = new Error(
        `Zoom API failed with ${candidate.name}: ${message}`,
      );
      console.warn(lastError.message);

      if (
        response.status === 401 ||
        response.status === 403 ||
        message.toLowerCase().includes("invalid access token")
      ) {
        continue;
      }

      break;
    } catch (error) {
      lastError = new Error(
        `Zoom candidate ${candidate.name} failed: ${error.message}`,
      );
      console.warn(lastError.message);
    }
  }

  return {
    join_url: null,
    meetingId: null,
    start_time: null,
    duration: durationMinutes,
    topic,
    error: lastError ? lastError.message : "Zoom meeting creation failed",
  };
}

module.exports = { createZoomMeeting };
