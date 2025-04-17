interface IModel {
  readonly [key: string]: {
    model: string;
    api_key?: string;
  };
}

export const MODELS: IModel = {
  'QWEN/QWEN-2.5-7B': {
    model: 'qwen/qwen-2.5-7b-instruct:free',
  },
  LLAMA_4_MAVERICK: {
    model: 'meta-llama/llama-4-maverick:free',
  },
  'GOOGLE_GEMINI_2.5_PRO': {
    model: 'google/gemini-2.0-flash-exp:free',
  },
  DEEPSEEK_V3_BASE: {
    model: 'deepseek/deepseek-chat:free',
  },
};
