# GitSum

**AI-Powered Git Commit Log Summarizer**

GitSum is an Electron desktop application that uses Claude AI to intelligently summarize your Git commit logs. Whether you need a quick technical overview or a general summary for non-technical teammates, GitSum transforms your commit history into meaningful, readable summaries.

## ✨ Features

- **📁 Repository Selection**: Easy folder picker to select any Git repository
- **🌿 Branch Selection**: Choose between current branch or any specific branch
- **📅 Flexible Date Ranges**: 
  - Today, Yesterday, 3 days, 1 week, 2 weeks, 1 month
  - Custom date range picker
- **👥 Summary Modes**:
  - **Technical**: Detailed technical insights for developers
  - **General**: Simplified summaries for broader audiences
- **📊 Detail Levels**: Brief, Moderate, or Detailed summaries
- **🔥 Hot Files Analysis**: Identify the most frequently modified files
- **📄 Copy to Clipboard**: Easy copying of generated summaries
- **⚙️ Settings Management**: Configure Claude API settings

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Git installed on your system
- Claude API key from Anthropic

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/git-commit-summarizer.git
   cd git-commit-summarizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

### Setup

1. **Configure API Key**: 
   - Click the ⚙️ Settings button
   - Enter your Claude API key from [Anthropic Console](https://console.anthropic.com/)

2. **Select Repository**:
   - Click "Select Folder" to choose your Git repository
   - The app will automatically detect the current branch

3. **Choose Your Options**:
   - Select summary mode (Technical/General)
   - Pick detail level (Brief/Moderate/Detailed)
   - Choose time period for commit analysis

4. **Generate Summary**:
   - Click "📊 Summarize" to generate AI-powered commit summary
   - Use "🔥 Hot Files Analysis" to see most active files

## 🔧 Development

### Scripts

- `npm start` - Run the application
- `npm run dev` - Run in development mode
- `npm run build` - Build the application
- `npm run pack` - Package the application

### Building

To create a distributable version:

```bash
npm run build
```

This will create installers in the `dist` folder for your platform.

## 📋 Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: Version 16 or higher
- **Git**: Must be installed and accessible from command line
- **Claude API**: Valid API key from Anthropic

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ☕ Support

If you find GitSum helpful, consider supporting the development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/dokyung)

## 🔗 Links

- [Claude AI by Anthropic](https://www.anthropic.com/claude)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Report Issues](https://github.com/your-username/git-commit-summarizer/issues)

---

Made with ❤️ for developers who want to make sense of their Git history. 