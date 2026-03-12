/**
 * Factory Engines - Schema Engine
 * 
 * This file (validator.ts) is part of the schema processing pipeline.
 * Full implementation to be completed.
 */

// src/core/schema_engine/validator.ts

import { ApplicationModel } from '../../core/metadata_model/entity.js';

export class SchemaValidator {
    validate(model: ApplicationModel): string[] {
        const errors: string[] = [];
        
        // Check for duplicate entity names
        const entityNames = new Set<string>();
        for (const [name] of model.entities) {
            if (entityNames.has(name)) {
                errors.push(`Duplicate entity name: ${name}`);
            }
            entityNames.add(name);
        }
        
        // Validate field types
        const validTypes = ['string', 'int', 'boolean', 'date', 'float'];
        for (const [name, entity] of model.entities) {
            for (const [fieldName, field] of entity.fields) {
                if (!validTypes.includes(field.type)) {
                    errors.push(`Entity ${name}: Invalid field type '${field.type}' for field '${fieldName}'`);
                }
            }
        }
        
        return errors;
    }
}