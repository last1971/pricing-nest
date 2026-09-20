// Ответы api.mpn.cc — только те поля, которые читаем. Ручки /v1/catalog/parts/* и
// /v1/catalog/acquisitions не описаны в их OpenAPI, поэтому всё необязательное.

export interface UpstreamManufacturer {
    name: string;
    slug: string;
    url_path?: string;
    website_url?: string | null;
    logo_url?: string | null;
}

export interface UpstreamPartBrief {
    mpn: string;
    description?: string | null;
    package?: string | null;
    category?: string | null;
    url_path: string; // '/parts/{manufacturerSlug}/{mpnSlug}'
    manufacturer: UpstreamManufacturer;
}

export interface UpstreamMatch {
    type: 'exact' | 'similar' | 'none' | string;
    score: number;
}

export interface UpstreamCandidate {
    part: UpstreamPartBrief;
    match: UpstreamMatch;
}

/** GET /v1/resolve?q= */
export interface UpstreamResolve {
    query: string;
    query_type: string;
    match: UpstreamMatch;
    part: UpstreamPartBrief | null;
    candidates: UpstreamCandidate[];
}

/** POST /v1/catalog/acquisitions */
export interface UpstreamAcquisition {
    status: 'already_available' | 'acquired' | 'checking' | 'not_found' | 'unavailable' | string;
    published: number;
    candidates: number;
    retry_after_ms?: number;
}

export interface UpstreamDatasheet {
    url: string;
    role?: string | null;
    revision?: string | null;
    is_primary?: boolean;
}

export interface UpstreamSpecDefinition {
    key: string;
    label?: string;
    group?: string;
    priority?: string;
}

export interface UpstreamAlternative {
    relationship?: string;
    confidence?: number;
    part?: UpstreamPartBrief;
}

/** GET /v1/catalog/parts/{manufacturerSlug}/{mpnSlug} → part */
export interface UpstreamPart extends UpstreamPartBrief {
    lifecycle_status?: string | null;
    catalog_status?: string;
    mounting_type?: string | null;
    datasheets?: UpstreamDatasheet[];
    product_url?: string | null;
    image_url?: string | null;
    specification_definitions?: UpstreamSpecDefinition[];
    parameters?: Record<string, string> | null;
    // Набор ключей плавает: htsus у одних, ushts/taric/cnhts/country_of_origin у других.
    compliance?: Record<string, string> | null;
    alternatives?: UpstreamAlternative[];
    aliases?: unknown[];
}

export interface UpstreamPartResponse {
    part: UpstreamPart;
}
