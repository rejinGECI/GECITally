"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ElectionState, UserRole } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin access required");
  return { supabase, user };
}

export async function upsertElection(formData: FormData) {
  try {
    const { supabase } = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      date: String(formData.get("date") ?? ""),
      total_votes_polled: Number(formData.get("total_votes_polled") ?? 0),
      count_limit: Number(formData.get("count_limit") ?? 1),
    };

    if (!payload.name || !payload.date) {
      return { error: "Election name and date are required." };
    }
    if (payload.count_limit < 1) {
      return { error: "Count finalisation limit must be at least 1." };
    }
    if (payload.total_votes_polled < 0) {
      return { error: "Total votes polled cannot be negative." };
    }

    if (id) {
      const { error } = await supabase.from("elections").update(payload).eq("id", id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("elections").insert(payload);
      if (error) return { error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/results");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save election." };
  }
}

export async function setElectionState(electionId: string, state: ElectionState) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("elections").update({ state }).eq("id", electionId);
    if (error) return { error: error.message };
    revalidatePath("/admin");
    revalidatePath("/staff");
    revalidatePath("/supervisor");
    revalidatePath("/results");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update state." };
  }
}

export async function savePost(formData: FormData) {
  try {
    const { supabase } = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const payload = {
      election_id: String(formData.get("election_id") ?? ""),
      name: String(formData.get("name") ?? "").trim(),
      seats: Number(formData.get("seats") ?? 1),
      display_order: Number(formData.get("display_order") ?? 0),
    };
    if (!payload.name) return { error: "Post name is required." };
    if (payload.seats < 1) return { error: "Seats must be at least 1." };

    if (id) {
      const { error } = await supabase.from("posts").update(payload).eq("id", id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("posts").insert(payload);
      if (error) return { error: error.message };
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save post." };
  }
}

export async function deletePost(postId: string) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) return { error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete post." };
  }
}

export async function saveCandidate(formData: FormData) {
  try {
    const { supabase } = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const payload = {
      post_id: String(formData.get("post_id") ?? ""),
      name: String(formData.get("name") ?? "").trim(),
      photo_url: String(formData.get("photo_url") ?? "").trim() || null,
      panel_name: String(formData.get("panel_name") ?? "").trim() || null,
      display_order: Number(formData.get("display_order") ?? 0),
    };
    if (!payload.name) return { error: "Candidate name is required." };

    if (id) {
      const { error } = await supabase.from("candidates").update(payload).eq("id", id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("candidates").insert(payload);
      if (error) return { error: error.message };
    }
    revalidatePath("/admin");
    revalidatePath("/results");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save candidate." };
  }
}

export async function deleteCandidate(candidateId: string) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("candidates").delete().eq("id", candidateId);
    if (error) return { error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete candidate." };
  }
}

export async function createStaffAccount(formData: FormData) {
  try {
    await requireAdmin();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "staff") as UserRole;
    const postIds = formData.getAll("post_ids").map(String).filter(Boolean);

    if (!fullName || !email || !password) {
      return { error: "Name, email, and password are required." };
    }
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    if (!["admin", "staff", "supervisor"].includes(role)) {
      return { error: "Invalid role." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error || !data.user) {
      return { error: error?.message ?? "Could not create user." };
    }

    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      role,
    });

    if (role === "staff" && postIds.length) {
      const { error: assignError } = await admin.from("staff_assignments").insert(
        postIds.map((post_id) => ({ staff_id: data.user!.id, post_id })),
      );
      if (assignError) return { error: assignError.message };
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create account." };
  }
}

export async function updateStaffAssignments(staffId: string, postIds: string[]) {
  try {
    const { supabase } = await requireAdmin();
    const { error: deleteError } = await supabase
      .from("staff_assignments")
      .delete()
      .eq("staff_id", staffId);
    if (deleteError) return { error: deleteError.message };

    if (postIds.length) {
      const { error } = await supabase.from("staff_assignments").insert(
        postIds.map((post_id) => ({ staff_id: staffId, post_id })),
      );
      if (error) return { error: error.message };
    }
    revalidatePath("/admin");
    revalidatePath("/staff");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update assignments." };
  }
}

export async function updateProfileRole(profileId: string, role: UserRole) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
    if (error) return { error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update role." };
  }
}

export async function resetElectionCounts(electionId: string) {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.rpc("reset_election_counts", {
      p_election_id: electionId,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin");
    revalidatePath("/staff");
    revalidatePath("/supervisor");
    revalidatePath("/results");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reset counts." };
  }
}
