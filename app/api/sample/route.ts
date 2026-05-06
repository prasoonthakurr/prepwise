import { createSampleInterviews } from "@/lib/actions/general.action";

export async function POST() {
  try {
    await createSampleInterviews();
    return Response.json({
      success: true,
      message: "Sample interviews created",
    });
  } catch (error) {
    console.error("Error creating sample interviews:", error);
    return Response.json({ success: false, error: error }, { status: 500 });
  }
}

export async function GET() {
  try {
    // For now, just return a simple message
    return Response.json({ success: true, message: "Sample API working" });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error }, { status: 500 });
  }
}
