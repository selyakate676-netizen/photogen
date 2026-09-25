import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { deletePrivateObject, deletePrivatePrefix } from "@/lib/personas/api";
import { createServiceRoleClient } from "@/utils/supabase/admin";

type DbClient = {
  from: (table: string) => any;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

type DeletionTask = {
  id: string;
  user_id: string;
  object_key: string;
  entity_type: "persona_photo" | "persona";
  entity_id: string;
  status: "pending" | "processing" | "storage_deleted" | "completed";
};

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : "Deletion cleanup failed").slice(0, 500);
}

async function setTaskState(serviceDb: DbClient, task: DeletionTask, status: "pending" | "storage_deleted" | "completed", lastError?: string) {
  const { error } = await serviceDb.rpc("set_deletion_task_state", {
    p_task_id: task.id,
    p_user_id: task.user_id,
    p_status: status,
    p_last_error: lastError ?? null,
  });
  if (error) throw error;
}

async function finalizeEntity(sessionDb: DbClient | null, serviceDb: DbClient, task: DeletionTask) {
  if (!sessionDb) {
    const { error } = await serviceDb.rpc("finalize_deletion_task", { p_task_id: task.id });
    if (error) throw error;
    return;
  }
  if (task.entity_type === "persona_photo") {
    const { data: photo, error: photoError } = await sessionDb
      .from("persona_photos")
      .select("persona_id")
      .eq("id", task.entity_id)
      .maybeSingle();
    if (photoError) throw photoError;
    if (!photo) return;
    const { error } = await sessionDb.rpc("delete_persona_photo", {
      p_persona_id: photo.persona_id,
      p_photo_id: task.entity_id,
    });
    if (error) throw error;
    return;
  }

  const { data: persona, error: personaError } = await sessionDb
    .from("personas")
    .select("id")
    .eq("id", task.entity_id)
    .maybeSingle();
  if (personaError) throw personaError;
  if (!persona) return;
  const { error } = await sessionDb.rpc("delete_persona", { p_persona_id: task.entity_id });
  if (error) throw error;
}

export async function processDeletionTask(sessionDb: DbClient | null, task: DeletionTask) {
  const serviceDb = createServiceRoleClient() as unknown as DbClient;
  const { data: claimedRows, error: claimError } = await serviceDb.rpc("claim_deletion_task", {
    p_task_id: task.id,
    p_user_id: task.user_id,
  });
  if (claimError) throw claimError;
  const claimed = (claimedRows?.[0] ?? task) as DeletionTask;

  try {
    if (claimed.status !== "storage_deleted") {
      if (claimed.entity_type === "persona") await deletePrivatePrefix(claimed.object_key);
      else await deletePrivateObject(claimed.object_key);
      await setTaskState(serviceDb, claimed, "storage_deleted");
    }
    await finalizeEntity(sessionDb, serviceDb, claimed);
    await setTaskState(serviceDb, claimed, "completed");
  } catch (error) {
    await setTaskState(serviceDb, claimed, "pending", safeError(error)).catch((stateError) => {
      console.error("Could not persist deletion task retry state", stateError);
    });
    throw error;
  }
}

export async function processEntityDeletionTask(
  sessionDb: DbClient,
  userId: string,
  entityType: DeletionTask["entity_type"],
  entityId: string,
) {
  const serviceDb = createServiceRoleClient() as unknown as DbClient;
  const { data, error } = await serviceDb
    .from("deletion_tasks")
    .select("id,user_id,object_key,entity_type,entity_id,status")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .neq("status", "completed")
    .single();
  if (error || !data) throw error ?? new Error("Deletion task not found");
  await processDeletionTask(sessionDb, data as DeletionTask);
}

export async function reconcileDeletionTasks(sessionDb: DbClient, userId: string, limit = 20) {
  const serviceDb = createServiceRoleClient() as unknown as DbClient;
  const { data, error } = await serviceDb
    .from("deletion_tasks")
    .select("id,user_id,object_key,entity_type,entity_id,status")
    .eq("user_id", userId)
    .neq("status", "completed")
    .order("created_at")
    .limit(limit);
  if (error) throw error;

  let completed = 0;
  let failed = 0;
  for (const task of (data ?? []) as DeletionTask[]) {
    try {
      await processDeletionTask(sessionDb, task);
      completed += 1;
    } catch {
      failed += 1;
    }
  }
  return { attempted: (data ?? []).length, completed, failed };
}

export async function reconcileAllDeletionTasks(limit = 20) {
  const serviceDb = createServiceRoleClient() as unknown as DbClient;
  const { data, error } = await serviceDb
    .from("deletion_tasks")
    .select("id,user_id,object_key,entity_type,entity_id,status")
    .neq("status", "completed")
    .order("created_at")
    .limit(limit);
  if (error) throw error;

  let completed = 0;
  let failed = 0;
  for (const task of (data ?? []) as DeletionTask[]) {
    try {
      await processDeletionTask(null, task);
      completed += 1;
    } catch {
      failed += 1;
    }
  }
  return { attempted: (data ?? []).length, completed, failed };
}
