#!/usr/bin/env node

/**
 * File System Explorer MCP Server
 * 
 * A beginner-friendly MCP server that demonstrates core MCP concepts
 * through practical file system operations.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Input validation schemas using Zod
 */
const ListDirectoryArgsSchema = z.object({
  path: z.string().describe("The directory path to list")
});

const ReadFileArgsSchema = z.object({
  path: z.string().describe("The file path to read")
});

const FileInfoArgsSchema = z.object({
  path: z.string().describe("The file or directory path to get info about")
});

const SearchFilesArgsSchema = z.object({
  directory: z.string().describe("The directory to search in"),
  pattern: z.string().describe("The filename pattern to search for (supports wildcards)")
});

/**
 * Helper function to safely resolve and validate paths
 */
function validatePath(inputPath: string): string {
  // Resolve the path to prevent directory traversal
  const resolved = path.resolve(inputPath);
  
  // For security, you might want to restrict to certain directories
  // This is a basic example - in production, implement proper access controls
  
  return resolved;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Simple pattern matching for file search (supports * wildcards)
 */
function matchesPattern(filename: string, pattern: string): boolean {
  // Convert glob pattern to regex, being more precise with extensions
  let regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots first
    .replace(/\*/g, '.*')   // Convert * to .*
    .replace(/\?/g, '.');   // Convert ? to .
  
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  return regex.test(filename);
}

/**
 * Recursively search for files matching a pattern
 */
async function searchFiles(directory: string, pattern: string, maxResults: number = 50): Promise<string[]> {
  const results: string[] = [];
  
  async function searchRecursive(currentDir: string, depth: number = 0) {
    // Limit recursion depth to prevent infinite loops
    if (depth > 10 || results.length >= maxResults) return;
    
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isFile() && matchesPattern(entry.name, pattern)) {
          results.push(fullPath);
        } else if (entry.isDirectory()) {
          // Recursively search subdirectories
          await searchRecursive(fullPath, depth + 1);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.error(`Unable to search directory ${currentDir}:`, error);
    }
  }
  
  await searchRecursive(directory);
  return results;
}

/**
 * Create the MCP server
 */
const server = new Server(
  {
    name: "filesystem-explorer",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_directory",
        description: "List the contents of a directory",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The directory path to list"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "read_file",
        description: "Read the contents of a text file",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The file path to read"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "get_file_info",
        description: "Get detailed information about a file or directory",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The file or directory path to get info about"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "search_files",
        description: "Search for files by name pattern in a directory",
        inputSchema: {
          type: "object",
          properties: {
            directory: {
              type: "string",
              description: "The directory to search in"
            },
            pattern: {
              type: "string",
              description: "The filename pattern to search for (supports * wildcards)"
            }
          },
          required: ["directory", "pattern"]
        }
      }
    ]
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_directory": {
        const { path: dirPath } = ListDirectoryArgsSchema.parse(args);
        const safePath = validatePath(dirPath);
        
        const entries = await fs.readdir(safePath, { withFileTypes: true });
        const items = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(safePath, entry.name);
            try {
              const stats = await fs.stat(fullPath);
              return {
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
                size: entry.isFile() ? formatFileSize(stats.size) : null,
                modified: stats.mtime.toISOString()
              };
            } catch (error) {
              return {
                name: entry.name,
                type: entry.isDirectory() ? 'directory' : 'file',
                size: null,
                modified: null,
                error: 'Unable to read stats'
              };
            }
          })
        );

        return {
          content: [
            {
              type: "text",
              text: `Directory listing for: ${safePath}\n\n` +
                    items
                      .sort((a, b) => {
                        // Sort directories first, then files
                        if (a.type !== b.type) {
                          return a.type === 'directory' ? -1 : 1;
                        }
                        return a.name.localeCompare(b.name);
                      })
                      .map(item => {
                        const icon = item.type === 'directory' ? '📁' : '📄';
                        const size = item.size ? ` (${item.size})` : '';
                        const modified = item.modified ? 
                          ` - Modified: ${new Date(item.modified).toLocaleString()}` : '';
                        return `${icon} ${item.name}${size}${modified}`;
                      })
                      .join('\n')
            }
          ]
        };
      }

      case "read_file": {
        const { path: filePath } = ReadFileArgsSchema.parse(args);
        const safePath = validatePath(filePath);
        
        const stats = await fs.stat(safePath);
        if (stats.isDirectory()) {
          throw new Error("Cannot read a directory as a file");
        }

        // Check file size to prevent reading huge files
        const maxSize = 1024 * 1024; // 1MB limit
        if (stats.size > maxSize) {
          throw new Error(`File too large (${formatFileSize(stats.size)}). Maximum size is ${formatFileSize(maxSize)}`);
        }

        const content = await fs.readFile(safePath, 'utf-8');
        
        return {
          content: [
            {
              type: "text",
              text: `File: ${safePath}\nSize: ${formatFileSize(stats.size)}\nModified: ${stats.mtime.toLocaleString()}\n\n--- Content ---\n${content}`
            }
          ]
        };
      }

      case "get_file_info": {
        const { path: targetPath } = FileInfoArgsSchema.parse(args);
        const safePath = validatePath(targetPath);
        
        const stats = await fs.stat(safePath);
        const isDirectory = stats.isDirectory();
        
        let additionalInfo = "";
        if (isDirectory) {
          try {
            const entries = await fs.readdir(safePath);
            additionalInfo = `\nContains: ${entries.length} items`;
          } catch (error) {
            additionalInfo = "\nUnable to read directory contents";
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `Path: ${safePath}\n` +
                    `Type: ${isDirectory ? 'Directory' : 'File'}\n` +
                    `Size: ${formatFileSize(stats.size)}\n` +
                    `Created: ${stats.birthtime.toLocaleString()}\n` +
                    `Modified: ${stats.mtime.toLocaleString()}\n` +
                    `Accessed: ${stats.atime.toLocaleString()}\n` +
                    `Permissions: ${stats.mode.toString(8)}${additionalInfo}`
            }
          ]
        };
      }

      case "search_files": {
        const { directory, pattern } = SearchFilesArgsSchema.parse(args);
        const safePath = validatePath(directory);
        
        const stats = await fs.stat(safePath);
        if (!stats.isDirectory()) {
          throw new Error("Search path must be a directory");
        }

        const results = await searchFiles(safePath, pattern);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No files matching pattern "${pattern}" found in ${safePath}`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} files matching "${pattern}" in ${safePath}:\n\n` +
                    results.map(file => `📄 ${file}`).join('\n')
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "file://current-directory",
        name: "Current Directory",
        description: "Information about the current working directory",
        mimeType: "text/plain"
      }
    ]
  };
});

/**
 * Handle resource reads
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "file://current-directory") {
    const currentDir = process.cwd();
    try {
      const stats = await fs.stat(currentDir);
      const entries = await fs.readdir(currentDir);
      
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `Current Working Directory: ${currentDir}\n` +
                  `Items: ${entries.length}\n` +
                  `Modified: ${stats.mtime.toLocaleString()}\n\n` +
                  `To explore this directory, use the list_directory tool with path: "${currentDir}"`
          }
        ]
      };
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `Error reading current directory: ${error}`
          }
        ]
      };
    }
  }

  throw new Error(`Unknown resource: ${uri}`);
});

/**
 * List available prompts
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "explore_project",
        description: "Help explore and understand a project directory structure",
        arguments: [
          {
            name: "project_path",
            description: "Path to the project directory",
            required: true
          }
        ]
      },
      {
        name: "file_analysis",
        description: "Analyze files in a directory for common patterns and content",
        arguments: [
          {
            name: "directory_path",
            description: "Path to analyze",
            required: true
          },
          {
            name: "file_types",
            description: "Comma-separated list of file extensions to focus on (e.g., 'js,ts,py')",
            required: false
          }
        ]
      }
    ]
  };
});

/**
 * Handle prompt requests
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "explore_project": {
      const projectPath = args?.project_path as string;
      if (!projectPath) {
        throw new Error("project_path argument is required");
      }

      return {
        description: "Project exploration prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please help me explore and understand the project at: ${projectPath}

I'd like you to:
1. First, get information about the project directory using get_file_info
2. List the contents of the main directory using list_directory  
3. Look for important files like README, package.json, requirements.txt, etc.
4. Read any documentation files you find
5. Provide a summary of:
   - What type of project this appears to be
   - The main technologies/languages used
   - The overall structure and organization
   - Key files and their purposes
   - Any getting started information you can find

Start by examining the project directory structure.`
            }
          }
        ]
      };
    }

    case "file_analysis": {
      const directoryPath = args?.directory_path as string;
      const fileTypes = args?.file_types as string;
      
      if (!directoryPath) {
        throw new Error("directory_path argument is required");
      }

      const fileTypesInstruction = fileTypes ? 
        `Focus particularly on these file types: ${fileTypes}` :
        "Look at all file types you find";

      return {
        description: "File analysis prompt",
        messages: [
          {
            role: "user", 
            content: {
              type: "text",
              text: `Please analyze the files in: ${directoryPath}

I'd like you to:
1. List the directory contents using list_directory
2. Search for different types of files (use search_files with patterns like "*.js", "*.py", "*.md", etc.)
3. Read a sample of files to understand the codebase
4. ${fileTypesInstruction}
5. Provide an analysis covering:
   - File types and technologies used
   - Code structure and patterns
   - Documentation quality
   - Potential issues or improvements
   - Overall code organization

Start by exploring the directory structure.`
            }
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("File System Explorer MCP Server running on stdio");
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.error("Shutting down File System Explorer MCP Server...");
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error("Shutting down File System Explorer MCP Server...");
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});