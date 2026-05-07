export interface MdMirrorPayload {
  readonly markdown: string;
  readonly sourceUrl: string;
}

export interface CreateMdMirrorRouteOptions<
  TParams extends Record<string, string | string[] | undefined>,
> {
  /**
   * Resolve the markdown for a given URL/params, or return null when the page
   * doesn't exist (route returns 404).
   */
  readonly load: (args: {
    request: Request;
    params: TParams;
  }) => Promise<MdMirrorPayload | null>;
}

type RouteContext<TParams> = { params: Promise<TParams> };

export const createMdMirrorRoute =
  <
    TParams extends Record<string, string | string[] | undefined> = Record<
      string,
      string | string[] | undefined
    >,
  >(
    opts: CreateMdMirrorRouteOptions<TParams>,
  ) =>
  async (request: Request, ctx: RouteContext<TParams>): Promise<Response> => {
    const params = await ctx.params;
    const result = await opts.load({ request, params });
    if (result === null) return new Response("Not found", { status: 404 });
    return new Response(result.markdown, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "x-source-url": result.sourceUrl,
        "cache-control": "public, max-age=300, s-maxage=86400",
      },
    });
  };
