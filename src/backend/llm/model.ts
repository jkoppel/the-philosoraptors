import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { match } from "ts-pattern";

export enum ApiProvider {
  OpenAI,
  Anthropic,
}

export const getDefaultModel = (args?: {
  temperature?: number;
  apiProvider: ApiProvider;
}): BaseChatModel => {
  const temperature = args?.temperature ?? 0.0;
  const apiProvider = args?.apiProvider ?? ApiProvider.Anthropic;
  const maxConcurrency = 12;

  return match(apiProvider)
    .with(
      ApiProvider.OpenAI,
      () =>
        new ChatOpenAI({
          temperature,
          modelName: "gpt-4-turbo-preview",
          maxConcurrency,
        }),
    )
    .with(
      ApiProvider.Anthropic,
      () =>
        new ChatAnthropic({
          temperature,
          modelName: AnthropicModel.Claude_3_5_Sonnet as string,
          maxConcurrency,
        }),
    )
    .otherwise(() => {
      // jkoppel: 23 Jun 2024: Why can't I get .exhaustive() to work?
      throw new Error("Unsupported API provider");
    });
};

enum AnthropicModel {
  Claude_3_Haiku = "claude-3-haiku-20240307",
  Claude_3_5_Sonnet = "claude-3-5-sonnet-20240620",
}
