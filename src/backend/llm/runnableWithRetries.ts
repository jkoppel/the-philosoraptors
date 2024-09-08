import { ZodError, ZodIssueCode, ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable, RunnableLambda } from "@langchain/core/runnables";

// #######################################
//            Error helps
// #######################################

const formatZodErrorForLlm = (value: object, e: ZodError) => {
  if (e.errors.length == 1) {
    const issue = e.issues[0];

    if (issue.code === ZodIssueCode.invalid_type) {
      if (issue.received === "undefined") {
        return `response.${issue.path.join(".")} is undefined, but it should be a ${issue.expected}`;
      } else {
        let wrongValue: string;

        getWrongValue: {
          let x = value;
          for (const p of issue.path) {
            /* @ts-expect-error */
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            x = x[p];
          }
          wrongValue = JSON.stringify(x);
        }

        if (wrongValue.length > 10) {
          // Arbitrary constant; assuming longer things are identifiable by value
          return `You wrote\n\n${wrongValue}\n\nbut that has the wrong type ${issue.received}. Change it to have type ${issue.expected}.`;
        }
      }
    }
  }

  return e.toString();
};

// #######################################
//             Retry logic
// #######################################

// Todo how do i import this?
type InputValues<K extends string = string> = Record<K, any>;

type RetryArgs<T extends InputValues, ZI> = {
  llm: BaseChatModel;
  prompt: ChatPromptTemplate<T>;
  zodParser: ZodSchema<ZI>;
  maxAttempts?: number;
};

// NOTE 15 Feb 2024: RetryOutputParser in Langchain Python essentially
//                   does this; still waiting for the TS version to have it
export const createValidatedRunnable = <T extends InputValues, Z>({
  llm,
  prompt: originalPrompt,
  zodParser,
  maxAttempts = 3,
}: RetryArgs<T, Z>): Runnable<T, Z> => {
  return RunnableLambda.from(
    async (invocationParams: T, options): Promise<Z> => {
      const jsonSchema = zodToJsonSchema(zodParser);

      // ##############################
      // Happy path
      // ##############################
      const runnable = originalPrompt.pipe(
        llm.withStructuredOutput(jsonSchema),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      let response = await runnable.invoke(invocationParams, options?.config);
      let validationResult = await zodParser.safeParseAsync(response);
      if (validationResult.success) {
        return validationResult.data;
      }

      // ##############################
      // Retry logic
      // ##############################
      let attempt = 1;
      let lastError = validationResult.error;

      while (attempt <= maxAttempts) {
        console.log(`Response is ${JSON.stringify(response)}`);
        console.error(
          `Failed to generate a valid response: retry attempt ${attempt} of ${maxAttempts}`,
          { zodError: lastError, response },
        );
        const runnable = ChatPromptTemplate.fromTemplate(reviseTemplate).pipe(
          llm.withStructuredOutput(jsonSchema),
        );

        const lastResponse = response;

        console.log(`Rerunning with 
          ${JSON.stringify({
            originalPrompt: await originalPrompt.format(invocationParams),
            completion: JSON.stringify(lastResponse),
            error: formatZodErrorForLlm(lastResponse, lastError),
          })}`);

        response = await runnable.invoke(
          {
            originalPrompt: await originalPrompt.format(invocationParams),
            completion: JSON.stringify(lastResponse),
            error: formatZodErrorForLlm(lastResponse, lastError),
          },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          options?.config,
        );
        validationResult = await zodParser.safeParseAsync(response);

        if (validationResult.success) {
          return validationResult.data; // If validation succeeds, return the response
        } else {
          lastError = validationResult.error; // Update lastError with the latest error details
          attempt++;
        }
      }

      throw new Error(
        "Failed to generate a valid response after maximum attempts.",
      );
    },
  );
};

const reviseTemplate = `Original prompt:
--------------
{originalPrompt}
--------------

Completion:
--------------
{completion}
--------------

Above, the completion did not satisfy the constraints given by the original prompt and provided schema.

Error:
--------------
{error}
--------------

Try again. Only respond with an answer that satisfies the constraints laid out in the original prompt and provided schema:` as const;
