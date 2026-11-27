"use client";

import { createContext } from "react";
import type { WorkspaceContext } from "@/types/workspace";

export const MaterialVisitContext = createContext<WorkspaceContext | null>(null);
export const MaterialVisitProductContext = createContext<string | null>(null);
