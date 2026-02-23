#!/usr/bin/env node

/**
 * NocoDB MCP Server
 *
 * Standalone MCP server that exposes NocoDB's full Meta API and Data API
 * as tools for LLM integration. Communicates via stdio transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { NocoDBClient } from "./nocodb-client.js";

// ──────────────────────────────────────────────
//  Configuration
// ──────────────────────────────────────────────

const NOCODB_URL = process.env["NOCODB_URL"];
const NOCODB_API_TOKEN = process.env["NOCODB_API_TOKEN"];

if (!NOCODB_URL || !NOCODB_API_TOKEN) {
    console.error(
        "Error: NOCODB_URL and NOCODB_API_TOKEN environment variables are required."
    );
    console.error("Example:");
    console.error('  NOCODB_URL=http://localhost:8080 NOCODB_API_TOKEN=xxx node dist/index.js');
    process.exit(1);
}

const client = new NocoDBClient({
    baseUrl: NOCODB_URL,
    apiToken: NOCODB_API_TOKEN,
});

// ──────────────────────────────────────────────
//  MCP Server
// ──────────────────────────────────────────────

const server = new McpServer({
    name: "nocodb-mcp-server",
    version: "1.0.0",
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BASES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool("nocodb_list_bases", "List all bases (projects) in NocoDB", {}, async () => {
    try {
        const result = await client.listBases();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
        return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
    }
});

server.tool(
    "nocodb_get_base",
    "Get details of a specific base by ID",
    { baseId: z.string().describe("The base (project) ID") },
    async ({ baseId }) => {
        try {
            const result = await client.getBase(baseId);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_create_base",
    "Create a new base (project) in NocoDB",
    {
        title: z.string().describe("Title for the new base"),
        description: z.string().optional().describe("Optional description"),
        color: z.string().optional().describe("Optional hex color code"),
    },
    async ({ title, description, color }) => {
        try {
            const result = await client.createBase({ title, description, color });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_update_base",
    "Update an existing base",
    {
        baseId: z.string().describe("The base ID to update"),
        title: z.string().optional().describe("New title"),
        description: z.string().optional().describe("New description"),
        color: z.string().optional().describe("New hex color code"),
    },
    async ({ baseId, title, description, color }) => {
        try {
            const result = await client.updateBase(baseId, { title, description, color });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_delete_base",
    "Delete a base (project) — this is destructive",
    { baseId: z.string().describe("The base ID to delete") },
    async ({ baseId }) => {
        try {
            const result = await client.deleteBase(baseId);
            return { content: [{ type: "text", text: JSON.stringify(result ?? { success: true }, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SOURCES (Data Sources / Connections)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
    "nocodb_list_sources",
    "List all data sources (connections) for a base",
    { baseId: z.string().describe("The base ID") },
    async ({ baseId }) => {
        try {
            const result = await client.listSources(baseId);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_create_source",
    "Add a new external data source (e.g. MySQL, Postgres) to a base",
    {
        baseId: z.string().describe("The base ID"),
        alias: z.string().describe("Alias/display name for the data source"),
        type: z.string().describe("Database type: mysql2, pg, sqlite3, mssql, oracledb"),
        config: z
            .string()
            .describe(
                "JSON string of connection config (host, port, user, password, database)"
            ),
    },
    async ({ baseId, alias, type, config }) => {
        try {
            const parsedConfig = JSON.parse(config) as Record<string, unknown>;
            const result = await client.createSource(baseId, {
                alias,
                type,
                config: parsedConfig,
            });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_update_source",
    "Update a data source connection",
    {
        baseId: z.string().describe("The base ID"),
        sourceId: z.string().describe("The source ID to update"),
        payload: z.string().describe("JSON string of fields to update"),
    },
    async ({ baseId, sourceId, payload }) => {
        try {
            const parsedPayload = JSON.parse(payload) as Record<string, unknown>;
            const result = await client.updateSource(baseId, sourceId, parsedPayload);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_delete_source",
    "Remove a data source from a base",
    {
        baseId: z.string().describe("The base ID"),
        sourceId: z.string().describe("The source ID to delete"),
    },
    async ({ baseId, sourceId }) => {
        try {
            const result = await client.deleteSource(baseId, sourceId);
            return { content: [{ type: "text", text: JSON.stringify(result ?? { success: true }, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TABLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
    "nocodb_list_tables",
    "List all tables in a base",
    { baseId: z.string().describe("The base ID") },
    async ({ baseId }) => {
        try {
            const result = await client.listTables(baseId);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_get_table",
    "Get detailed information about a specific table including its columns",
    { tableId: z.string().describe("The table ID") },
    async ({ tableId }) => {
        try {
            const result = await client.getTable(tableId);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_create_table",
    "Create a new table in a base with specified columns",
    {
        baseId: z.string().describe("The base ID"),
        table_name: z.string().describe("Internal table name (no spaces)"),
        title: z.string().describe("Display title for the table"),
        columns: z
            .string()
            .describe(
                'JSON array of column definitions. Each column: { "column_name": "name", "title": "Name", "uidt": "SingleLineText" }. uidt values: SingleLineText, LongText, Number, Decimal, Checkbox, Date, DateTime, Email, URL, PhoneNumber, Currency, Percent, Duration, Rating, SingleSelect, MultiSelect, Attachment, LinkToAnotherRecord, Lookup, Rollup, Formula, etc.'
            ),
    },
    async ({ baseId, table_name, title, columns }) => {
        try {
            const parsedColumns = JSON.parse(columns) as Array<{
                column_name: string;
                title: string;
                uidt: string;
                [key: string]: unknown;
            }>;
            const result = await client.createTable(baseId, {
                table_name,
                title,
                columns: parsedColumns,
            });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_update_table",
    "Update a table (e.g. rename)",
    {
        tableId: z.string().describe("The table ID"),
        title: z.string().optional().describe("New display title"),
    },
    async ({ tableId, title }) => {
        try {
            const result = await client.updateTable(tableId, { title });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_delete_table",
    "Delete a table — this is destructive and removes all its data",
    { tableId: z.string().describe("The table ID to delete") },
    async ({ tableId }) => {
        try {
            const result = await client.deleteTable(tableId);
            return { content: [{ type: "text", text: JSON.stringify(result ?? { success: true }, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FIELDS / COLUMNS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
    "nocodb_list_fields",
    "List all fields (columns) of a table",
    { tableId: z.string().describe("The table ID") },
    async ({ tableId }) => {
        try {
            const result = await client.listFields(tableId);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_create_field",
    "Add a new field (column) to a table",
    {
        tableId: z.string().describe("The table ID"),
        column_name: z.string().describe("Internal column name"),
        title: z.string().describe("Display title"),
        uidt: z
            .string()
            .describe(
                "UI Data Type: SingleLineText, LongText, Number, Decimal, Checkbox, Date, DateTime, Email, URL, PhoneNumber, Currency, SingleSelect, MultiSelect, etc."
            ),
        options: z.string().optional().describe("Optional JSON string of additional column options"),
    },
    async ({ tableId, column_name, title, uidt, options }) => {
        try {
            const payload: Record<string, unknown> = { column_name, title, uidt };
            if (options) {
                const parsedOptions = JSON.parse(options) as Record<string, unknown>;
                Object.assign(payload, parsedOptions);
            }
            const result = await client.createField(
                tableId,
                payload as { column_name: string; title: string; uidt: string }
            );
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_update_field",
    "Update an existing field (column)",
    {
        columnId: z.string().describe("The column ID"),
        payload: z.string().describe("JSON string of fields to update (e.g. title, column_name)"),
    },
    async ({ columnId, payload }) => {
        try {
            const parsedPayload = JSON.parse(payload) as Record<string, unknown>;
            const result = await client.updateField(columnId, parsedPayload);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_delete_field",
    "Delete a field (column) from a table",
    { columnId: z.string().describe("The column ID to delete") },
    async ({ columnId }) => {
        try {
            const result = await client.deleteField(columnId);
            return { content: [{ type: "text", text: JSON.stringify(result ?? { success: true }, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VIEWS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
    "nocodb_list_views",
    "List all views for a table",
    { tableId: z.string().describe("The table ID") },
    async ({ tableId }) => {
        try {
            const result = await client.listViews(tableId);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_create_view",
    "Create a new view for a table. NocoDB uses type-specific endpoints so the type determines the API path used.",
    {
        tableId: z.string().describe("The table ID"),
        title: z.string().describe("View title"),
        type: z
            .number()
            .optional()
            .describe("View type: 1=Form, 2=Gallery, 3=Grid (default), 4=Kanban, 6=Calendar"),
        fk_grp_col_id: z
            .string()
            .optional()
            .describe("Foreign key to grouping column (required for Kanban, optional for Gallery)"),
    },
    async ({ tableId, title, type, fk_grp_col_id }) => {
        try {
            const result = await client.createView(tableId, { title, type, fk_grp_col_id });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_update_view",
    "Update a view (rename, lock/unlock, reorder, etc.)",
    {
        viewId: z.string().describe("The view ID to update"),
        title: z.string().optional().describe("New view title"),
        payload: z.string().optional().describe("Optional JSON string of additional fields to update (e.g. lock_type, order, show_system_fields)"),
    },
    async ({ viewId, title, payload }) => {
        try {
            const data: Record<string, unknown> = {};
            if (title !== undefined) {
                data.title = title;
            }
            if (payload) {
                const parsedPayload = JSON.parse(payload) as Record<string, unknown>;
                Object.assign(data, parsedPayload);
            }
            const result = await client.updateView(viewId, data);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_delete_view",
    "Delete a view",
    { viewId: z.string().describe("The view ID to delete") },
    async ({ viewId }) => {
        try {
            const result = await client.deleteView(viewId);
            return { content: [{ type: "text", text: JSON.stringify(result ?? { success: true }, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RECORDS (Data CRUD)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

server.tool(
    "nocodb_list_records",
    "Query/list records from a table with optional filtering, sorting, and pagination",
    {
        tableId: z.string().describe("The table ID"),
        where: z
            .string()
            .optional()
            .describe(
                "Filter condition, e.g. (Status,eq,Active)~and(Age,gt,18). Operators: eq, neq, gt, lt, gte, lte, like, nlike, is, isnot"
            ),
        limit: z.number().optional().describe("Max records to return (default 25, max 1000)"),
        offset: z.number().optional().describe("Number of records to skip"),
        sort: z.string().optional().describe("Sort by field, prefix with - for desc, e.g. -Created"),
        fields: z.string().optional().describe("Comma-separated list of field names to include"),
        viewId: z.string().optional().describe("Optional view ID to scope query"),
    },
    async ({ tableId, where, limit, offset, sort, fields, viewId }) => {
        try {
            const result = await client.listRecords(tableId, {
                where,
                limit,
                offset,
                sort,
                fields,
                viewId,
            });
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_create_records",
    "Insert one or more records into a table",
    {
        tableId: z.string().describe("The table ID"),
        records: z
            .string()
            .describe(
                'JSON array of record objects. Each object maps field titles to values, e.g. [{"Name": "Alice", "Age": 30}]'
            ),
    },
    async ({ tableId, records }) => {
        try {
            const parsedRecords = JSON.parse(records) as Array<Record<string, unknown>>;
            const result = await client.createRecords(tableId, parsedRecords);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_update_records",
    "Update one or more existing records in a table",
    {
        tableId: z.string().describe("The table ID"),
        records: z
            .string()
            .describe(
                'JSON array of record objects. Each must include the row "Id" field, e.g. [{"Id": 1, "Name": "Updated"}]'
            ),
    },
    async ({ tableId, records }) => {
        try {
            const parsedRecords = JSON.parse(records) as Array<Record<string, unknown>>;
            const result = await client.updateRecords(tableId, parsedRecords);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

server.tool(
    "nocodb_delete_records",
    "Delete one or more records from a table by their row IDs",
    {
        tableId: z.string().describe("The table ID"),
        recordIds: z
            .string()
            .describe("JSON array of row IDs to delete, e.g. [1, 2, 3]"),
    },
    async ({ tableId, recordIds }) => {
        try {
            const parsedIds = JSON.parse(recordIds) as Array<string | number>;
            const result = await client.deleteRecords(tableId, parsedIds);
            return { content: [{ type: "text", text: JSON.stringify(result ?? { success: true }, null, 2) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${(error as Error).message}` }], isError: true };
        }
    }
);

// ──────────────────────────────────────────────
//  Start Server
// ──────────────────────────────────────────────

async function main(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("NocoDB MCP Server running on stdio");
}

main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
