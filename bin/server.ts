#!/usr/bin/env tsx

import { createHttpServer } from "../lib/http-server.ts";

createHttpServer().catch(console.error);
