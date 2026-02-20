export type FeedType = "breast" | "formula";

export type FeedLogRow = {
  id: string;
  created_at: string;
  feed_type: FeedType;
  left_minutes: number | null;
  right_minutes: number | null;
  formula_ml: number | null;
};

export type AppSettingsRow = {
  id: number;
  breast_ml_per_minute: number;
  updated_at: string;
};
