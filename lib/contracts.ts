export const MAX_DREAM_LENGTH = 500;
export const MAX_ROUND = 2_147_483_647;

export type Dream = {
  id: string;
  dream: string;
  createdAt: string;
  hidden: boolean;
};

export type WallSnapshot = {
  round: number;
  generation: number;
  revision: number;
  paused: boolean;
  pollingEnabled: boolean;
  feedbackVisible: boolean;
  dreams: Dream[];
};
