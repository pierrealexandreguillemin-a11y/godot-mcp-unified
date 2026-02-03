/**
 * Zod Schemas for MCP Tool Validation
 * ISO/IEC 5055 compliant - centralized validation
 * ISO/IEC 25010 compliant - data integrity
 *
 * DEPRECATED: This file re-exports from src/schemas/ for backward compatibility.
 * New code should import directly from src/schemas/index.ts or domain-specific modules.
 *
 * Compatible with Zod 4.x
 */

// Re-export everything from the new modular schema structure
export * from '../schemas/index.js';
