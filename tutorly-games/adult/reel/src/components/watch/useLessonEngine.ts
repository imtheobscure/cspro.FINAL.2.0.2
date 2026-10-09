"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActivityStateValue } from "@/db/schema";
import { flattenActivities, type Activity, type LessonSegment, type VideoLesson } from "@/modules/lessons/types";
import { usePlayerStore, type PlayerController } from "@/modules/player/store";
import type { AttemptResponse } from "./types";

const DONE: ActivityStateValue[] = ["answered", "correct", "incorrect", "skipped", "completed"];
export const isDone = (s?: ActivityStateValue) => !!s && DONE.includes(s);

type Args = {
  lessonId: string | null;
  lesson: VideoLesson | null;
  initialStates: Record<string, ActivityStateValue>;
  controller: PlayerController;
  onOutcome?: (res: AttemptResponse) => void;
};

export function useLessonEngine({ lessonId, lesson, initialStates, controller, onOutcome }: Args) {
  const [states, setStates] = useState<Record<string, ActivityStateValue>>(initialStates);
  const [active, setActive] = useState<{ activity: Activity; segment: LessonSegment } | null>(null);
  const [lastResult, setLastResult] = useState<AttemptResponse | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completedModal, setCompletedModal] = useState(false);
  const statesRef = useRef(states);
  const activeRef = useRef(active);
  const startedAt = useRef<number>(0);
  const wasPlaying = useRef(false);
  statesRef.current = states;
  activeRef.current = active;

  const entries = useMemo(() => (lesson ? flattenActivities(lesson) : []), [lesson]);

  const trigger = useCallback(
    (activityId: string) => {
      const entry = entries.find((e) => e.activity.id === activityId);
      if (!entry) return;
      wasPlaying.current = !usePlayerStore.getState().paused;
      if (entry.activity.behavior !== "overlay") controller.pause();
      startedAt.current = Date.now();
      setLastResult(null);
      setActive(entry);
      setStates((s) => (isDone(s[activityId]) ? s : { ...s, [activityId]: "active" }));
      controller.bus.emit("ACTIVITY_TRIGGER", { activityId, time: controller.currentTime });
    },
    [entries, controller],
  );

  // Timeline triggers
  useEffect(() => {
    if (!entries.length) return;
    return controller.bus.on("TIME_UPDATE", ({ time }) => {
      if (activeRef.current) return;
      const hit = entries.find((e) => !isDone(statesRef.current[e.activity.id]) && time >= e.activity.timestamp && time < e.activity.timestamp + 2);
      if (hit) trigger(hit.activity.id);
    });
  }, [entries, controller, trigger]);

  // Seek guard: required activities cannot be skipped by scrubbing forward
  useEffect(() => {
    controller.seekGuard = (from, to) => {
      if (to <= from) return to;
      const blocking = entries.find((e) => e.activity.requiredForNext && !isDone(statesRef.current[e.activity.id]) && e.activity.timestamp > from + 0.05 && e.activity.timestamp < to - 0.05);
      if (blocking) {
        usePlayerStore.getState().toastMessage(`“${blocking.activity.title}” is required before you continue`, "warn");
        setTimeout(() => trigger(blocking.activity.id), 50);
        return blocking.activity.timestamp;
      }
      return to;
    };
    return () => {
      controller.seekGuard = null;
    };
  }, [entries, controller, trigger]);

  const submit = useCallback(
    async (answer: unknown) => {
      if (!active || !lessonId) return null;
      setSubmitting(true);
      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, activityId: active.activity.id, answer, timeSpent: Math.round((Date.now() - startedAt.current) / 1000), videoTimestamp: controller.currentTime }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "Request failed" }))).error);
        const data = (await res.json()) as AttemptResponse;
        setStates(data.activityStates);
        setLastResult(data);
        setSessionXp((x) => x + data.xpEarned);
        controller.bus.emit("ACTIVITY_COMPLETE", { activityId: active.activity.id, correct: data.correct, points: data.xpEarned });
        if (data.completedNow) controller.bus.emit("LESSON_COMPLETE", { lessonId });
        onOutcome?.(data);
        return data;
      } catch (err) {
        usePlayerStore.getState().toastMessage((err as Error).message || "Could not save your answer", "warn");
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [active, lessonId, controller, onOutcome],
  );

  const persistState = useCallback(
    async (patch: Record<string, ActivityStateValue>) => {
      if (!lessonId) return;
      setStates((s) => ({ ...s, ...patch }));
      await fetch(`/api/lessons/${lessonId}/state`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityStates: patch, videoPosition: controller.currentTime }) }).catch(() => undefined);
    },
    [lessonId, controller],
  );

  const close = useCallback(
    (resume = true) => {
      const wasCompleted = lastResult?.completedNow;
      setActive(null);
      setLastResult(null);
      if (wasCompleted) setCompletedModal(true);
      else if (resume && wasPlaying.current) void controller.play();
    },
    [controller, lastResult],
  );

  const skip = useCallback(async () => {
    if (!active) return;
    const id = active.activity.id;
    setActive(null);
    setLastResult(null);
    await persistState({ [id]: "skipped" });
    if (wasPlaying.current) void controller.play();
  }, [active, persistState, controller]);

  const retry = useCallback(() => {
    startedAt.current = Date.now();
    setLastResult(null);
  }, []);

  const jumpTo = useCallback(
    (activityId: string) => {
      const entry = entries.find((e) => e.activity.id === activityId);
      if (!entry) return;
      controller.pause();
      controller.seek(Math.max(0, entry.activity.timestamp - 0.2), "engine");
      trigger(activityId);
    },
    [entries, controller, trigger],
  );

  const total = entries.length;
  const done = entries.filter((e) => isDone(states[e.activity.id])).length;
  const correct = entries.filter((e) => states[e.activity.id] === "correct" || states[e.activity.id] === "completed").length;

  return { states, active, lastResult, submitting, sessionXp, submit, skip, retry, close, jumpTo, trigger, completedModal, setCompletedModal, progress: { total, done, correct, percentage: total ? Math.round((done / total) * 100) : 0 } };
}
