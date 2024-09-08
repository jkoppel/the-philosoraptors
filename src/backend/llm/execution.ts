
import z, { ZodSchema } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";

import { getDefaultModel } from "./model";
import { createValidatedRunnable } from "./runnableWithRetries";



// #######################################
//            Message template
// #######################################

type Param<L extends string> = `{${L}}`;

type InferFormatParams<S> = S extends `${string}${Param<infer L>}${infer T}`
  ? { [k in L]: string } & InferFormatParams<T>
  : object;

type ObjectTupleIntersection<
  A,
  T extends [...unknown[]],
> = T["length"] extends 0
  ? A
  : ObjectTupleIntersection<A & T[0], T extends [unknown, ...infer R] ? R : []>;

export type ParamsFromMessages<
  M extends [...Array<[string, string] | MessagesPlaceholder>],
> = ObjectTupleIntersection<
  object,
  {
    [I in keyof M]: M[I] extends [string, infer S]
      ? S extends string
        ? InferFormatParams<S>
        : object
      : object;
  }
>;

export const messageTemplate = <
  M extends [...Array<[string, string] | MessagesPlaceholder>],
>(
  ...messages: M
): ChatPromptTemplate<ParamsFromMessages<M>> =>
  ChatPromptTemplate.fromMessages(messages);

export type InferChatPromptTemplateInput<P> =
  P extends ChatPromptTemplate<infer I> ? I : never;

/********************************************
 *************** Easy running ***************
 ********************************************/



/****
 * Example usage:
 *   const prompt = `Answer me these questions three if the other side you wish to see: {q1}\n\n{q2}\n{q3}` as const;
 *   const res = await easyRunLlmValidated({
 *     prompt,
 *     zodParser: z.object({
 *       q1_answer: z.string(),
 *       q2_answer: z.string(),
 *       q3_answer: z.string(),
 *     }),
 *   },
 *   {
 *       q1: "What is thy name?",
 *       q2: "What is thy quest?",
 *       q3: "What is thy favorite color?",
 *   });
 */
export const easyRunLlmValidated = async <ZI, Z extends ZodSchema<ZI>>(
    args: {
      prompt: string;
      zodParser: Z;
    },
    inputs: Record<string, any>,
  ): Promise<z.infer<Z>> => {
    const promptTemplate = messageTemplate(["user", args.prompt]);
    const model = getDefaultModel();
  
    const runnable = createValidatedRunnable({
      llm: model,
      prompt: promptTemplate,
      zodParser: args.zodParser,
    });
  
    const res = await runnable.invoke(inputs, {});
  
    return res;
  };
  
  export const easyRunLlm = async (
    args: {
      prompt: string;
    },
    inputs: Record<string, any>,
  ): Promise<string> => {
    const promptTemplate = messageTemplate(["user", args.prompt]);
    const model = getDefaultModel();
  
    const runnable = promptTemplate.pipe(model);
  
    const res = await runnable.invoke(inputs, {});
  
    return String(res.content);
  };
