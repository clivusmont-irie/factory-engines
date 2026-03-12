#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { SchemaParser } from '../core/schema_engine/parser.js';
import { SchemaValidator } from '../core/schema_engine/validator.js';

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

const program = new Command();

program
    .name('factory')
    .description('Factory Engines - Schema-driven full-stack generator')
    .version('0.1.0');

program
    .command('new <project-name>')
    .description('Create a new project')
    .option('-d, --database <type>', 'Database type (mysql/postgres)', 'mysql')
    .option('-b, --backend <type>', 'Backend framework (node/python)', 'node')
    .option('-f, --frontend <type>', 'Frontend framework (react/vue)', 'react')
    .action(async (projectName, options) => {
        console.log(chalk.blue(`\n🏭 Creating project: ${chalk.bold(projectName)}\n`));
        
        try {
            // Create project directory
            await fs.mkdir(projectName);
            console.log(chalk.green(`  ✅ Created directory: ${projectName}/`));
            
            // Create schemas subdirectory
            await fs.mkdir(path.join(projectName, 'schemas'));
            console.log(chalk.green(`  ✅ Created directory: ${projectName}/schemas/`));
            
            // Create default configuration
            const defaultConfig = {
                name: projectName,
                database: options.database,
                backend: options.backend,
                frontend: options.frontend,
                created: new Date().toISOString()
            };
            
            await fs.writeFile(
                path.join(projectName, 'factory.config.json'),
                JSON.stringify(defaultConfig, null, 2)
            );
            console.log(chalk.green(`  ✅ Created file: ${projectName}/factory.config.json`));
            
            // Create example schema file
            const exampleSchema = {
                entities: {
                    Example: {
                        table: 'examples',
                        fields: {
                            id: { type: 'int', primary: true },
                            name: { type: 'string', required: true },
                            created_at: { type: 'date' }
                        }
                    }
                },
                database: options.database,
                backend: options.backend,
                frontend: options.frontend
            };
            
            await fs.writeFile(
                path.join(projectName, 'schemas', 'example.json'),
                JSON.stringify(exampleSchema, null, 2)
            );
            console.log(chalk.green(`  ✅ Created example schema: ${projectName}/schemas/example.json`));
            
            console.log(chalk.blue(`\n📋 Next steps:\n`));
            console.log(chalk.cyan(`  cd ${projectName}`));
            console.log(chalk.cyan(`  factory entity YourEntityName`));
            console.log(chalk.cyan(`  factory generate\n`));
            
        } catch (error) {
            console.error(chalk.red(`\n❌ Error creating project: ${getErrorMessage(error)}\n`));
            process.exit(1);
        }
    });

program
    .command('entity <name>')
    .description('Create a new entity schema file')
    .option('-t, --table <name>', 'Table name (defaults to plural of entity name)')
    .action(async (name, options) => {
        console.log(chalk.blue(`\n🏭 Creating new entity: ${chalk.bold(name)}\n`));
        
        try {
            // Check if schemas directory exists
            const schemaDir = path.join(process.cwd(), 'schemas');
            await fs.access(schemaDir);
            
            // Generate table name (plural lowercase)
            const tableName = options.table || `${name.toLowerCase()}s`;
            
            // Create entity schema
            const entitySchema = {
                entities: {
                    [name]: {
                        table: tableName,
                        fields: {
                            id: { type: 'int', primary: true },
                            name: { type: 'string', required: true },
                            created_at: { type: 'date' },
                            updated_at: { type: 'date' }
                        }
                    }
                }
            };
            
            const filePath = path.join(schemaDir, `${name.toLowerCase()}.json`);
            await fs.writeFile(
                filePath,
                JSON.stringify(entitySchema, null, 2)
            );
            
            console.log(chalk.green(`  ✅ Created entity schema: ${filePath}\n`));
            console.log(chalk.cyan(`  Edit this file to add custom fields for ${name}\n`));
            
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                console.error(chalk.red(`\n❌ No schemas/ directory found. Are you in a factory project?\n`));
            } else {
                console.error(chalk.red(`\n❌ Error creating entity: ${getErrorMessage(error)}\n`));
            }
            process.exit(1);
        }
    });

program
    .command('generate')
    .description('Generate full-stack application from schemas')
    .option('-c, --config <path>', 'Config file path', 'factory.config.json')
    .option('-o, --output <path>', 'Output directory', './generated')
    .action(async (options) => {
        console.log(chalk.blue('\n🏭 Generating application...\n'));
        
        try {
            // Load and validate config file
            const configPath = path.join(process.cwd(), options.config);
            let config;
            try {
                const configData = await fs.readFile(configPath, 'utf-8');
                config = JSON.parse(configData);
                console.log(chalk.green(`  ✅ Loaded config: ${options.config}`));
            } catch (error) {
                throw new Error(`Could not load config file: ${options.config}`);
            }
            
            // Check if schemas directory exists
            const schemaDir = path.join(process.cwd(), 'schemas');
            try {
                await fs.access(schemaDir);
            } catch {
                throw new Error('No schemas/ directory found. Create one with "factory entity"');
            }
            
            // Load all schema files
            const files = await fs.readdir(schemaDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            if (jsonFiles.length === 0) {
                throw new Error('No schema files found in schemas/ directory');
            }
            
            console.log(chalk.green(`  ✅ Found ${jsonFiles.length} schema file(s)\n`));
            
            // Initialize parser and validator
            const parser = new SchemaParser();
            const validator = new SchemaValidator();
            
            let hasErrors = false;
            
            // Process each schema file
            for (const file of jsonFiles) {
                console.log(chalk.cyan(`  Processing: ${file}`));
                
                const filePath = path.join(schemaDir, file);
                const schemaData = await fs.readFile(filePath, 'utf-8');
                const schema = JSON.parse(schemaData);
                
                // Parse schema
                const model = parser.parse(schema);
                
                // Validate schema
                const errors = validator.validate(model);
                
                if (errors.length > 0) {
                    console.log(chalk.red(`  ❌ Validation failed:`));
                    errors.forEach(e => console.log(chalk.red(`     - ${e}`)));
                    hasErrors = true;
                } else {
                    console.log(chalk.green(`  ✅ Validation passed`));
                }
            }
            
            if (hasErrors) {
                throw new Error('Validation failed for one or more schemas');
            }
            
            console.log(chalk.blue(`\n📦 All schemas validated successfully!\n`));
            
            // TODO: Pass models to generation engine
            console.log(chalk.yellow(`  ⚠️  Code generation not yet implemented\n`));
            
            // Create output directory
            const outputDir = path.join(process.cwd(), options.output);
            await fs.mkdir(outputDir, { recursive: true });
            
            console.log(chalk.green(`  ✅ Output directory ready: ${options.output}\n`));
            
        } catch (error) {
            console.error(chalk.red(`\n❌ Generation failed: ${getErrorMessage(error)}\n`));
            process.exit(1);
        }
    });

program
    .command('list')
    .description('List all entities in the current project')
    .action(async () => {
        console.log(chalk.blue('\n📋 Listing entities...\n'));
        
        try {
            const schemaDir = path.join(process.cwd(), 'schemas');
            await fs.access(schemaDir);
            
            const files = await fs.readdir(schemaDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            if (jsonFiles.length === 0) {
                console.log(chalk.yellow('  No entity schemas found.\n'));
                return;
            }
            
            for (const file of jsonFiles) {
                const filePath = path.join(schemaDir, file);
                const schemaData = await fs.readFile(filePath, 'utf-8');
                const schema = JSON.parse(schemaData);
                
                const entityNames = Object.keys(schema.entities || {});
                console.log(chalk.cyan(`  ${file}:`));
                entityNames.forEach(name => {
                    console.log(chalk.green(`    - ${name}`));
                });
            }
            console.log();
            
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                console.log(chalk.yellow('  No schemas/ directory found.\n'));
            } else {
                console.error(chalk.red(`\n❌ Error: ${getErrorMessage(error)}\n`));
            }
        }
    });

program.parse(process.argv);

if (process.argv.length === 2) {
    program.help();
}