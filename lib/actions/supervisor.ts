"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reviewRound(roundId: string, action: "verify" | "reject", remarks?: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const { error } = await supabase.rpc("review_count_round", {
      p_round_id: roundId,
      p_action: action,
      p_remarks: remarks || null,
    });

    if (error) return { error: error.message };

    revalidatePath("/supervisor");
    revalidatePath("/staff");
    revalidatePath("/results");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not review round." };
  }
}
