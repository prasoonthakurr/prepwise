import { signOut } from "@/lib/actions/auth.action";

export async function POST() {
  try {
    await signOut();
    return Response.json({ success: true });
  } catch (error) {
    console.error("Signout error:", error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
