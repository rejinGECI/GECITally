"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRoundEntries } from "@/lib/validators";

export async function submitCountRound(postId: string, entries: Array<{ candidate_id: string; votes: number }>) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    if (!entries.length) return { error: "Enter counts for every candidate." };
    const invalid = validateRoundEntries(
      entries.map((entry) => entry.candidate_id),
      entries,
    );
    if (invalid) return { error: invalid };

    const { data, error } = await supabase.rpc("submit_count_round", {
      p_post_id: postId,
      p_entries: entries,
    });

    if (error) {
      const message = error.message.includes("Duplicate")
        ? "Duplicate round detected. This round was already submitted."
        : error.message;
      return { error: message };
    }

    revalidatePath("/staff");
    revalidatePath(`/staff/${postId}`);
    revalidatePath("/supervisor");
    return { ok: true, round: data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not submit round." };
  }
}
