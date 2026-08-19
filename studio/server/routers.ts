import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getPublicSvgProject, listSvgProjectsForOwner, saveSvgProject } from "./svgProjects";

const projectInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().max(160),
  projectData: z.string().min(2).max(100_000),
  svgCode: z.string().min(20).max(250_000),
  isPublic: z.boolean(),
});

const suggestionSchema = {
  name: "svg_style_suggestions",
  strict: true,
  schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            rationale: { type: "string" },
            paletteName: { type: "string" },
            textColor: { type: "string" },
            accentColor: { type: "string" },
            backgroundColor: { type: "string" },
            fontWeight: { type: "number" },
            letterSpacing: { type: "number" },
            icon: { type: "string", enum: ["none", "circle", "square", "star", "spark", "leaf"] },
            layout: { type: "string", enum: ["center", "left", "right"] },
          },
          required: ["name", "rationale", "paletteName", "textColor", "accentColor", "backgroundColor", "fontWeight", "letterSpacing", "icon", "layout"],
          additionalProperties: false,
        },
      },
    },
    required: ["suggestions"],
    additionalProperties: false,
  },
} as const;

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  svgProjects: router({
    mine: protectedProcedure.query(({ ctx }) => listSvgProjectsForOwner(ctx.user.id)),
    save: protectedProcedure.input(projectInput).mutation(({ ctx, input }) => saveSvgProject(ctx.user.id, input)),
    shared: publicProcedure.input(z.object({ shareId: z.string().min(8).max(32) })).query(({ input }) => getPublicSvgProject(input.shareId)),
    suggest: publicProcedure.input(z.object({
      brand: z.string().min(1).max(120),
      industry: z.string().max(120),
      mood: z.string().max(120),
      locale: z.enum(["ja", "en"]),
    })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a precise brand designer. Propose three distinctly useful SVG logo styles. Return only JSON that conforms to the supplied schema. Every color must be a valid uppercase six-digit hex color. Use concise Japanese rationales when locale is ja, otherwise concise English rationales.",
          },
          {
            role: "user",
            content: `Brand name: ${input.brand}\nIndustry: ${input.industry || "unspecified"}\nDesired mood: ${input.mood || "unspecified"}\nLanguage: ${input.locale}`,
          },
        ],
        response_format: { type: "json_schema", json_schema: suggestionSchema },
        max_tokens: 1200,
      });
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string") throw new Error("AI提案を取得できませんでした。もう一度お試しください。");
      return JSON.parse(content) as { suggestions: Array<Record<string, string | number>> };
    }),
  }),
});

export type AppRouter = typeof appRouter;
