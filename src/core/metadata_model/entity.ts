/**
 * Factory Engines - Metadata Model
 * 
 * This file (entity.ts) is part of the schema processing pipeline.
 * Full implementation to be completed.
 */

// This is your internal metadata model (from spec)
export interface Field {
    name: string;
    type: 'string' | 'int' | 'boolean' | 'date' | 'float';
    primary?: boolean;
    required?: boolean;
    unique?: boolean;
    foreignKey?: {
        entity: string;
        field: string;
    };
}

export interface Entity {
    name: string;
    table: string;
    fields: Map<string, Field>;
    relationships: Relationship[];
}

export interface Relationship {
    type: 'one-to-many' | 'many-to-one' | 'many-to-many';
    fromEntity: string;
    toEntity: string;
    fromField?: string;
    toField?: string;
}

export interface ApplicationModel {
    entities: Map<string, Entity>;
    database: 'mysql' | 'postgres';
    backend: 'node' | 'python';
    frontend: 'react' | 'vue';
}