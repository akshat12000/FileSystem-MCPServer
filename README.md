# File System Explorer MCP Server

A beginner-friendly MCP (Model Context Protocol) server that demonstrates core MCP concepts through practical file system exploration tools. This project is perfect for learning MCP development while building something immediately useful.

## 🎯 What You'll Learn

This project teaches you essential MCP concepts:

- **Tools**: Interactive functions that AI can call (like listing directories or reading files)
- **Resources**: Static data sources that provide context (like current directory info)
- **Prompts**: Reusable templates that help users accomplish specific tasks
- **Server Architecture**: How to structure and implement a proper MCP server
- **Error Handling**: Best practices for robust MCP server development

## 🚀 Features

### 🛠️ Tools
- **`list_directory`** - List contents of any directory with file sizes and modification dates
- **`read_file`** - Read text files with safety limits and error handling
- **`get_file_info`** - Get detailed metadata about files and directories
- **`search_files`** - Search for files using wildcard patterns (supports `*` and `?`)

### 📄 Resources
- **Current Directory** - Provides information about the working directory

### 🎨 Prompts
- **`explore_project`** - Guided project exploration and analysis
- **`file_analysis`** - Analyze files in a directory for patterns and structure

## 🏗️ Project Structure

```
MCPServer/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript output
├── .vscode/
│   └── mcp.json         # MCP server configuration
├── .github/
│   └── copilot-instructions.md
├── package.json         # Node.js project configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## 📋 Prerequisites

Before you begin, ensure you have:
- **Node.js 18+** installed ([download here](https://nodejs.org/))
- **TypeScript** knowledge (basic understanding)
- **VS Code** (recommended for debugging)

## 🛠️ Installation & Setup

### 1. Clone and Install

```bash
# Navigate to the project directory
cd MCPServer

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Test Your Server

You can test your server using the MCP Inspector:

```bash
# Install and run MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

This opens a web interface where you can:
- Test all available tools
- View resources  
- Try out prompts
- Debug server responses

## 🎮 How to Use

### Basic Usage Examples

Once connected to an MCP client (like Claude Desktop), you can:

#### Explore a Directory
```
Can you list the contents of my Desktop folder?
```

#### Read a File
```
Please read the README.md file in my project directory
```

#### Search for Files
```
Find all JavaScript files in my project using the pattern "*.js"
```

#### Get File Information
```
What can you tell me about the package.json file?
```

### Using Prompts

The server includes helpful prompts:

#### Project Exploration
```
Use the explore_project prompt with my code directory
```

#### File Analysis
```
Analyze my src directory focusing on TypeScript files
```

## 🔧 Connecting to VS Code

1. Make sure you have the MCP extension installed in VS Code
2. The server is already configured in `.vscode/mcp.json`
3. Restart VS Code to load the configuration
4. You should see the MCP server available in the sidebar

## 🧪 Development Workflow

### Making Changes

1. **Edit the source code** in `src/index.ts`
2. **Rebuild the project**:
   ```bash
   npm run build
   ```
3. **Test your changes** using the MCP Inspector or restart your MCP client

### Development Mode

For faster development, use watch mode:

```bash
npm run dev
```

This automatically recompiles when you make changes.

## 📚 Understanding the Code

### Server Initialization
```typescript
const server = new Server(
  { name: "filesystem-explorer", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);
```

### Adding a Tool
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "your_tool_name": {
      // Your tool logic here
      return {
        content: [{ type: "text", text: "Tool response" }]
      };
    }
  }
});
```

### Security Features

The server includes several security measures:
- **Path validation** to prevent directory traversal
- **File size limits** to prevent reading huge files
- **Recursion limits** in directory search
- **Error handling** for permission issues

## 🎓 Learning Exercises

### Beginner Exercises
1. **Add a new tool** that counts lines in a text file
2. **Modify the file size limit** for reading files
3. **Add a new resource** that shows system information

### Intermediate Exercises
1. **Add file writing capabilities** (create_file, write_file tools)
2. **Implement a simple backup tool** that copies files
3. **Add support for binary files** with proper handling

### Advanced Exercises
1. **Add file watching capabilities** using Node.js file system events
2. **Implement a simple git integration** (status, log, diff)
3. **Add compression/decompression tools** for zip files

## 🐛 Troubleshooting

### Common Issues

**Server not starting:**
- Check that Node.js is installed: `node --version`
- Ensure dependencies are installed: `npm install`
- Verify build completed: `ls build/` (should contain index.js)

**Permission errors:**
- Make sure the server has read access to directories
- On Windows, avoid system directories that require admin access

**Build errors:**
- Clear and reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript configuration in `tsconfig.json`

## 🚀 Next Steps

Once you've mastered this server:

1. **Explore other MCP servers** in the [official repository](https://github.com/modelcontextprotocol/servers)
2. **Build your own specialized server** for your domain (database, API, etc.)
3. **Contribute to the MCP community** with your own implementations
4. **Learn about remote MCP servers** for cloud-based tools

## 📖 Additional Resources

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Community Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Inspector Documentation](https://github.com/modelcontextprotocol/inspector)

## 🤝 Contributing

Want to improve this learning resource?

1. Fork the repository
2. Make your improvements
3. Add tests if applicable
4. Submit a pull request

Ideas for contributions:
- Additional example tools
- Better error messages
- More comprehensive prompts
- Performance improvements
- Additional security features

## 📝 License

MIT License - feel free to use this code for learning and building your own MCP servers!

---

## 🎉 Congratulations!

You've successfully set up your first MCP server! This foundation will help you understand the Model Context Protocol and build more sophisticated integrations. The concepts you've learned here - tools, resources, prompts, and proper error handling - apply to all MCP server development.

Happy coding! 🚀