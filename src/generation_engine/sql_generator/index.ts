import { ApplicationModel, Entity, Field, Relationship } from '../../core/metadata_model/entity.js';

export class SQLGenerator {

    generate(model: ApplicationModel): string {
        const sqlParts: string[] = [];

        // Create a map for quick entity lookup
        const entityMap = new Map<string, Entity>();
        for (const [name, entity] of model.entities) {
            entityMap.set(name, entity);
        }

        // 1️⃣ Create tables (using values() to iterate over Map)
        for (const entity of model.entities.values()) {
            sqlParts.push(this.generateCreateTable(entity));
        }

        // 2️⃣ Foreign keys
        for (const entity of model.entities.values()) {
            const fks = this.generateForeignKeys(entity, entityMap);
            sqlParts.push(...fks);
        }

        // 3️⃣ Seed data (if any)
        for (const entity of model.entities.values()) {
            // Seed data would come from a separate source, not from Entity
            // This needs to be handled differently
        }

        return sqlParts.join("\n\n");
    }

    generateCreateTable(entity: Entity): string {
        const columns: string[] = [];

        // Fix: fields is a Map, iterate correctly
        for (const [fieldName, field] of entity.fields) {
            let col = `  ${fieldName} ${this.mapType(field)}`; 

            if (field.primary) {
                col += " PRIMARY KEY";
            }

            // Fix: use 'required' not 'notNull'
            if (field.required) {
                col += " NOT NULL";
            }

            if (field.unique) {
                col += " UNIQUE";
            }

            columns.push(col);
        }

        // Add timestamps if they don't exist (common pattern)
        if (!entity.fields.has('created_at')) {
            columns.push("  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        }
        if (!entity.fields.has('updated_at')) {
            columns.push("  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }

        return `
CREATE TABLE ${entity.table} (
${columns.join(",\n")}
);`.trim();
    }

    generateForeignKeys(entity: Entity, allEntities: Map<string, Entity>): string[] {
        const statements: string[] = [];

        if (!entity.relationships || entity.relationships.length === 0) {
            return statements;
        }

        for (const rel of entity.relationships) {
            // Fix: use correct property names from Relationship interface
            const targetEntity = allEntities.get(rel.toEntity);
            if (!targetEntity) {
                throw new Error(
                    `Entity "${entity.name}" references unknown entity "${rel.toEntity}"`
                );
            }

            // Find the foreign key field
            let foreignKeyField: string | undefined;
            let targetField: string = 'id'; // Default to id

            if (rel.type === 'many-to-one' || rel.type === 'one-to-many') {
                // For many-to-one, the foreign key is in the source entity
                foreignKeyField = rel.fromField || `${rel.toEntity.toLowerCase()}_id`;
                targetField = rel.toField || 'id';
            }

            if (foreignKeyField) {
                const fkName = `fk_${entity.table}_${rel.toEntity}_${foreignKeyField}`;
                
                statements.push(`
ALTER TABLE ${entity.table}
ADD CONSTRAINT ${fkName}
FOREIGN KEY (${foreignKeyField})
REFERENCES ${targetEntity.table}(${targetField})
ON DELETE SET NULL
ON UPDATE CASCADE;`.trim());

                // Optional index for foreign key performance
                statements.push(`
CREATE INDEX idx_${entity.table}_${foreignKeyField}
ON ${entity.table} (${foreignKeyField});`.trim());
            }
        }

        return statements;
    }

    private mapType(field: Field): string {
        // Use field.length if provided, otherwise default to 255
        switch (field.type) {
            case "string":
                const length = field.length || 255;  // ← This line does the magic
                return `VARCHAR(${length})`;
                
            case "int":
                return "INTEGER";
                
            case "float":
                return "FLOAT";
                
            case "boolean":
                return "BOOLEAN";
                
            case "date":
                return "DATE";
                
            default:
                throw new Error(`Unsupported field type: ${field.type}`);
        }
    }

    /**
     * Generate a complete schema with all tables and relationships
     */
    generateFullSchema(model: ApplicationModel): { sql: string, migrations: string[] } {
        const mainSQL = this.generate(model);
        
        // Generate individual migration files
        const migrations: string[] = [];
        for (const entity of model.entities.values()) {
            migrations.push(this.generateCreateTable(entity));
        }
        
        return {
            sql: mainSQL,
            migrations
        };
    }
}