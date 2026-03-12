/**
 * Factory Engines - Schema Engine
 * 
 * This file (parser.ts) is part of the schema processing pipeline.
 * Full implementation to be completed.
 */
// core/schema_engine/parser.ts

/**
 * RawSchema Interface
 * Defines the structure of the input JSON that the parser expects
 */
export interface RawSchema {
    database?: 'mysql' | 'postgres';
    backend?: 'node' | 'python';
    frontend?: 'react' | 'vue';
    entities: {
        [entityName: string]: {
            table?: string;
            fields: {
                [fieldName: string]: {
                    type: 'string' | 'int' | 'boolean' | 'date' | 'float';
                    primary?: boolean;
                    required?: boolean;
                    unique?: boolean;
                    foreignKey?: {
                        entity: string;
                        field: string;
                    };
                };
            };
        };
    };
}

/**
 * Import the internal metadata model interfaces
 * These define how our application represents the data internally
 */
import { Entity, Field, ApplicationModel } from '../metadata_model/entity';

/**
 * SchemaParser Class
 * 
 * Responsibilities:
 * 1. Receive raw JSON schema input (following RawSchema format)
 * 2. Convert it into the internal ApplicationModel format
 * 3. Create proper Entity objects with Fields and Relationships
 * 4. Return a fully populated ApplicationModel for downstream engines
 */
export class SchemaParser {
    
    /**
     * Parse a raw schema into an internal ApplicationModel
     * @param jsonSchema - The input schema following RawSchema interface
     * @returns A complete ApplicationModel ready for code generation
     */
    parse(jsonSchema: RawSchema): ApplicationModel {
        // Initialize the model with defaults from schema or fallbacks
        const model: ApplicationModel = {
            entities: new Map(),
            database: jsonSchema.database || 'mysql',
            backend: jsonSchema.backend || 'node',
            frontend: jsonSchema.frontend || 'react'
        };
        
        // If no entities defined, return empty model
        if (!jsonSchema.entities) {
            console.warn('Warning: No entities defined in schema');
            return model;
        }
        
        // Iterate through each entity definition in the raw schema
        for (const [entityName, entityDef] of Object.entries(jsonSchema.entities)) {
            
            // Create a new Entity object
            const entity: Entity = {
                name: entityName,
                // Use provided table name or generate plural lowercase version
                table: entityDef.table || entityName.toLowerCase() + 's',
                fields: new Map(),
                relationships: []
            };
            
            // Parse all fields for this entity
            if (entityDef.fields) {
                for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
                    // Create a Field object matching the Field interface
                    const field: Field = {
                        name: fieldName,
                        type: fieldDef.type,
                        primary: fieldDef.primary || false,
                        required: fieldDef.required || false,
                        unique: fieldDef.unique || false
                    };
                    
                    // Add foreign key if present
                    if (fieldDef.foreignKey) {
                        field.foreignKey = {
                            entity: fieldDef.foreignKey.entity,
                            field: fieldDef.foreignKey.field
                        };
                    }
                    
                    // Add the field to the entity's fields Map
                    entity.fields.set(fieldName, field);
                }
            }
            
            // Add the fully constructed entity to the model
            model.entities.set(entityName, entity);
        }
        
        return model;
    }
}
