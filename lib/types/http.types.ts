import type { FastifyRequest, FastifyReply } from "fastify";

export type TypedRequest<
  Body = unknown,
  Query = unknown,
  Params = unknown
> = FastifyRequest<{
  Body: Body;
  Querystring: Query;
  Params: Params;
}>;

export type TypedReply = FastifyReply;
