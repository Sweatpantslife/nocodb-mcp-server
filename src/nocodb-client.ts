/**
 * NocoDB API Client
 *
 * Wrapper around NocoDB's v2 Meta API and Data API.
 * Uses native fetch (Node 18+) — no external HTTP library needed.
 */

export interface NocoDBConfig {
    baseUrl: string;
    apiToken: string;
}

export class NocoDBClient {
    private readonly baseUrl: string;
    private readonly headers: Record<string, string>;

    constructor(config: NocoDBConfig) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.headers = {
            "xc-token": config.apiToken,
            "Content-Type": "application/json",
        };
    }

    // ──────────────────────────────────────────────
    //  Generic request helper
    // ──────────────────────────────────────────────

    private async request<T = unknown>(
        method: string,
        path: string,
        body?: unknown,
        queryParams?: Record<string, string>
    ): Promise<T> {
        let url = `${this.baseUrl}${path}`;
        if (queryParams) {
            const params = new URLSearchParams(queryParams);
            url += `?${params.toString()}`;
        }

        const options: RequestInit = {
            method,
            headers: this.headers,
        };

        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
                `NocoDB API error ${response.status} ${response.statusText}: ${errorBody}`
            );
        }

        // Some DELETE endpoints return 200 with no body
        const text = await response.text();
        if (!text) {
            return undefined as T;
        }
        return JSON.parse(text) as T;
    }

    // ──────────────────────────────────────────────
    //  META API — Bases
    // ──────────────────────────────────────────────

    async listBases(): Promise<unknown> {
        return this.request("GET", "/api/v2/meta/bases/");
    }

    async getBase(baseId: string): Promise<unknown> {
        return this.request("GET", `/api/v2/meta/bases/${encodeURIComponent(baseId)}`);
    }

    async createBase(payload: {
        title: string;
        description?: string;
        color?: string;
    }): Promise<unknown> {
        return this.request("POST", "/api/v2/meta/bases/", payload);
    }

    async updateBase(
        baseId: string,
        payload: { title?: string; description?: string; color?: string }
    ): Promise<unknown> {
        return this.request(
            "PATCH",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}`,
            payload
        );
    }

    async deleteBase(baseId: string): Promise<unknown> {
        return this.request(
            "DELETE",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}`
        );
    }

    // ──────────────────────────────────────────────
    //  META API — Sources (Connections / Data Sources)
    // ──────────────────────────────────────────────

    async listSources(baseId: string): Promise<unknown> {
        return this.request(
            "GET",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}/sources`
        );
    }

    async createSource(
        baseId: string,
        payload: {
            alias: string;
            type: string;
            config: Record<string, unknown>;
        }
    ): Promise<unknown> {
        return this.request(
            "POST",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}/sources`,
            payload
        );
    }

    async updateSource(
        baseId: string,
        sourceId: string,
        payload: Record<string, unknown>
    ): Promise<unknown> {
        return this.request(
            "PATCH",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}/sources/${encodeURIComponent(sourceId)}`,
            payload
        );
    }

    async deleteSource(baseId: string, sourceId: string): Promise<unknown> {
        return this.request(
            "DELETE",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}/sources/${encodeURIComponent(sourceId)}`
        );
    }

    // ──────────────────────────────────────────────
    //  META API — Tables
    // ──────────────────────────────────────────────

    async listTables(baseId: string): Promise<unknown> {
        return this.request(
            "GET",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}/tables`
        );
    }

    async getTable(tableId: string): Promise<unknown> {
        return this.request(
            "GET",
            `/api/v2/meta/tables/${encodeURIComponent(tableId)}`
        );
    }

    async createTable(
        baseId: string,
        payload: {
            table_name: string;
            title: string;
            columns: Array<{
                column_name: string;
                title: string;
                uidt: string;
                dt?: string;
                [key: string]: unknown;
            }>;
        }
    ): Promise<unknown> {
        return this.request(
            "POST",
            `/api/v2/meta/bases/${encodeURIComponent(baseId)}/tables`,
            payload
        );
    }

    async updateTable(
        tableId: string,
        payload: { title?: string;[key: string]: unknown }
    ): Promise<unknown> {
        return this.request(
            "PATCH",
            `/api/v2/meta/tables/${encodeURIComponent(tableId)}`,
            payload
        );
    }

    async deleteTable(tableId: string): Promise<unknown> {
        return this.request(
            "DELETE",
            `/api/v2/meta/tables/${encodeURIComponent(tableId)}`
        );
    }

    // ──────────────────────────────────────────────
    //  META API — Fields / Columns
    // ──────────────────────────────────────────────

    async listFields(tableId: string): Promise<unknown> {
        return this.request(
            "GET",
            `/api/v2/meta/tables/${encodeURIComponent(tableId)}/columns`
        );
    }

    async createField(
        tableId: string,
        payload: {
            column_name: string;
            title: string;
            uidt: string;
            dt?: string;
            [key: string]: unknown;
        }
    ): Promise<unknown> {
        return this.request(
            "POST",
            `/api/v2/meta/tables/${encodeURIComponent(tableId)}/columns`,
            payload
        );
    }

    async updateField(
        columnId: string,
        payload: Record<string, unknown>
    ): Promise<unknown> {
        return this.request(
            "PATCH",
            `/api/v2/meta/columns/${encodeURIComponent(columnId)}`,
            payload
        );
    }

    async deleteField(columnId: string): Promise<unknown> {
        return this.request(
            "DELETE",
            `/api/v2/meta/columns/${encodeURIComponent(columnId)}`
        );
    }

    // ──────────────────────────────────────────────
    //  META API — Views
    // ──────────────────────────────────────────────

    async listViews(tableId: string): Promise<unknown> {
        return this.request(
            "GET",
            `/api/v2/meta/tables/${encodeURIComponent(tableId)}/views`
        );
    }

    /**
     * Map view type number to the NocoDB v2 endpoint path segment.
     * 1=Form, 2=Gallery, 3=Grid (default), 4=Kanban, 6=Calendar
     */
    private getViewPathSegment(type?: number): string {
        switch (type) {
            case 1:
                return "forms";
            case 2:
                return "galleries";
            case 3:
                return "grids";
            case 4:
                return "kanbans";
            case 6:
                return "calendars";
            default:
                return "grids";
        }
    }

    async createView(
        tableId: string,
        payload: { title: string; type?: number; fk_grp_col_id?: string;[key: string]: unknown }
    ): Promise<unknown> {
        const segment = this.getViewPathSegment(payload.type);
        return this.request(
            "POST",
            `/api/v2/meta/tables/${encodeURIComponent(tableId)}/${segment}`,
            payload
        );
    }

    async updateView(
        viewId: string,
        payload: { title?: string;[key: string]: unknown }
    ): Promise<unknown> {
        return this.request(
            "PATCH",
            `/api/v2/meta/views/${encodeURIComponent(viewId)}`,
            payload
        );
    }

    async deleteView(viewId: string): Promise<unknown> {
        return this.request(
            "DELETE",
            `/api/v2/meta/views/${encodeURIComponent(viewId)}`
        );
    }

    // ──────────────────────────────────────────────
    //  DATA API — Records (CRUD)
    // ──────────────────────────────────────────────

    async listRecords(
        tableId: string,
        params?: {
            where?: string;
            limit?: number;
            offset?: number;
            sort?: string;
            fields?: string;
            viewId?: string;
        }
    ): Promise<unknown> {
        const query: Record<string, string> = {};
        if (params?.where) query["where"] = params.where;
        if (params?.limit !== undefined) query["limit"] = String(params.limit);
        if (params?.offset !== undefined) query["offset"] = String(params.offset);
        if (params?.sort) query["sort"] = params.sort;
        if (params?.fields) query["fields"] = params.fields;
        if (params?.viewId) query["viewId"] = params.viewId;

        return this.request(
            "GET",
            `/api/v2/tables/${encodeURIComponent(tableId)}/records`,
            undefined,
            query
        );
    }

    async createRecords(
        tableId: string,
        records: Array<Record<string, unknown>>
    ): Promise<unknown> {
        return this.request(
            "POST",
            `/api/v2/tables/${encodeURIComponent(tableId)}/records`,
            records
        );
    }

    async updateRecords(
        tableId: string,
        records: Array<Record<string, unknown>>
    ): Promise<unknown> {
        return this.request(
            "PATCH",
            `/api/v2/tables/${encodeURIComponent(tableId)}/records`,
            records
        );
    }

    async deleteRecords(
        tableId: string,
        recordIds: Array<string | number>
    ): Promise<unknown> {
        return this.request(
            "DELETE",
            `/api/v2/tables/${encodeURIComponent(tableId)}/records`,
            recordIds.map((id) => ({ Id: id }))
        );
    }
}
