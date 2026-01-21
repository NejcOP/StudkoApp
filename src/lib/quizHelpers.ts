import { supabase } from "@/integrations/supabase/client";

export interface UserQuizStats {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string | null;
  total_quizzes_completed: number;
  total_questions_answered: number;
  total_correct_answers: number;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentXP: number;
  xpForNextLevel: number;
  xpProgress: number;
  xpNeeded: number;
}

const LEVEL_TITLES = ["Bruec", "Študent", "Magister", "Doktor", "Profesor"];
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];

export function calculateLevel(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  return 5;
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level - 1] || "Profesor";
}

export function getXPForNextLevel(currentXP: number): number {
  const level = calculateLevel(currentXP);
  return LEVEL_THRESHOLDS[level] || 1000;
}

export function getLevelInfo(xp: number): LevelInfo {
  const level = calculateLevel(xp);
  const xpForNextLevel = getXPForNextLevel(xp);
  const previousLevelXP = level > 1 ? LEVEL_THRESHOLDS[level - 1] : 0;
  const xpNeeded = xpForNextLevel - previousLevelXP;
  const xpProgress = xp - previousLevelXP;

  return {
    level,
    title: getLevelTitle(level),
    currentXP: xp,
    xpForNextLevel,
    xpProgress,
    xpNeeded,
  };
}

export async function getUserStats(userId: string): Promise<UserQuizStats | null> {
  const { data, error } = await supabase
    .from("user_quiz_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No stats yet, create initial stats
      return await createInitialStats(userId);
    }
    console.error("Error fetching user stats:", error);
    return null;
  }

  return data;
}

export async function createInitialStats(userId: string): Promise<UserQuizStats | null> {
  const { data, error } = await supabase
    .from("user_quiz_stats")
    .insert({
      user_id: userId,
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0,
      total_quizzes_completed: 0,
      total_questions_answered: 0,
      total_correct_answers: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating initial stats:", error);
    return null;
  }

  return data;
}

export async function updateStatsAfterQuiz(
  userId: string,
  correctAnswers: number,
  totalQuestions: number
): Promise<{ stats: UserQuizStats | null; leveledUp: boolean; oldLevel: number }> {
  // Fetch current stats
  const currentStats = await getUserStats(userId);
  if (!currentStats) {
    return { stats: null, leveledUp: false, oldLevel: 1 };
  }

  const xpGained = correctAnswers * 10;
  const newXP = currentStats.total_xp + xpGained;
  const oldLevel = currentStats.current_level;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > oldLevel;

  // Calculate streak
  const today = new Date().toISOString().split("T")[0];
  const lastQuizDate = currentStats.last_quiz_date;
  let newStreak = currentStats.current_streak;

  if (lastQuizDate) {
    const lastDate = new Date(lastQuizDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Same day, keep streak
      newStreak = currentStats.current_streak;
    } else if (diffDays === 1) {
      // Consecutive day, increment streak
      newStreak = currentStats.current_streak + 1;
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
    }
  } else {
    // First quiz ever
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, currentStats.longest_streak);

  // Update stats
  const { data, error } = await supabase
    .from("user_quiz_stats")
    .update({
      total_xp: newXP,
      current_level: newLevel,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_quiz_date: today,
      total_quizzes_completed: currentStats.total_quizzes_completed + 1,
      total_questions_answered: currentStats.total_questions_answered + totalQuestions,
      total_correct_answers: currentStats.total_correct_answers + correctAnswers,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating stats:", error);
    return { stats: null, leveledUp: false, oldLevel };
  }

  return { stats: data, leveledUp, oldLevel };
}
