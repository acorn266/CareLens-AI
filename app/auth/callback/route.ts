import { createSupabaseClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Get the correct base URL from environment or request
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  if (code) {
    const supabase = createSupabaseClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Successful email confirmation - redirect to home
        return NextResponse.redirect(new URL(next, baseUrl));
      } else {
        console.error("Auth callback error:", error);
        // Redirect to home with error message
        return NextResponse.redirect(
          new URL(`/?error=auth_error`, baseUrl)
        );
      }
    } catch (err) {
      console.error("Auth callback exception:", err);
      return NextResponse.redirect(new URL(`/?error=auth_error`, baseUrl));
    }
  }

  // No code provided - redirect to home
  return NextResponse.redirect(new URL(next, baseUrl));
}
