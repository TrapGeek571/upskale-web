require("dotenv").config();
const { createZoomMeeting } = require("./shared/zoom");

(async () => {
  try {
    console.log("Starting Zoom meeting creation test...");
    const meeting = await createZoomMeeting({
      topic: `Upskale Test Meeting - ${new Date().toISOString()}`,
      durationMinutes: 30,
    });
    console.log("Zoom create result:");
    console.log(JSON.stringify(meeting, null, 2));
    if (meeting.join_url) {
      console.log("\nSUCCESS: join_url present");
    } else {
      console.log("\nNo join_url returned. See error field for details.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
})();
