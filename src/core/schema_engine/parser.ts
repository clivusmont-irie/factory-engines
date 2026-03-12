/**
 * Factory Engines - Schema Engine
 * 
 * This file (parser.ts) is part of the schema processing pipeline.
 * Full implementation to be completed.
 */
// core/schema_engine/parser.ts



/**
 * Import the internal metadata model interfaces
 * These define how our application represents the data internally
 */
import { Entity, Field, ApplicationModel, RawSchema } from '../../core/metadata_model/entity.js';



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
    
        parse(jsonSchema: RawSchema): ApplicationModel {
            const model: ApplicationModel = {
                entities: new Map(),
                database: jsonSchema.database || 'mysql',
                backend: jsonSchema.backend || 'node',
                frontend: jsonSchema.frontend || 'react'
            };
            
            if (!jsonSchema.entities) {
                console.warn('Warning: No entities defined in schema');
                return model;
            }
            
            for (const [entityName, entityDef] of Object.entries(jsonSchema.entities)) {
                const entity: Entity = {
                    name: entityName,
                    table: entityDef.table || entityName.toLowerCase() + 's',
                    fields: new Map(),
                    relationships: []
                };
                
                if (entityDef.fields) {
                    for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
                        const field: Field = {
                            name: fieldName,
                            type: fieldDef.type,
                            primary: fieldDef.primary || false,
                            required: fieldDef.required || false,
                            unique: fieldDef.unique || false
                        };
                        
                        if (fieldDef.foreignKey) {
                            field.foreignKey = {
                                entity: fieldDef.foreignKey.entity,
                                field: fieldDef.foreignKey.field
                            };
                        }
                        
                        entity.fields.set(fieldName, field);
                    }
                }
                
                model.entities.set(entityName, entity);
            }
            
            return model;
    }
}

