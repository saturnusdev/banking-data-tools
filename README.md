# Data Tools

A comprehensive suite of data processing utilities built with Svelte, featuring modern UI design and powerful functionality for developers and data analysts.

## 🚀 Features

### Core Tools

#### **IDM to Swagger Converter**
- **Purpose**: Convert Excel IDM specifications to professional Swagger/OpenAPI documentation
- **Features**:
  - Excel file upload and processing
  - Swagger template support with conflict detection
  - API metadata configuration (name, version, business service, etc.)
  - Live Swagger UI preview
  - YAML export functionality
  - Modern orange/red gradient UI theme

#### **ISO8583 Parser**
- **Purpose**: Parse and analyze ISO8583 financial transaction messages
- **Features**:
  - Real-time ISO8583 message parsing
  - Detailed message properties display (MTI, version, class, function, origin)
  - Data elements extraction with field information
  - Error handling and validation
  - Modern teal/cyan gradient UI theme

#### **DFDL Parser**
- **Purpose**: Parse base64 encoded data using DFDL schema with EBCDIC conversion
- **Features**:
  - Support for both request (RQTYPE) and response (RSTYPE) parsing
  - DFDL schema file upload (.xml/.xsd)
  - Local file storage and management
  - EBCDIC character conversion
  - Configurable header length and options
  - Detailed parsing results with debug information
  - Results export functionality
  - Modern indigo/purple gradient UI theme

#### **JavaScript Minify/Unminify**
- **Purpose**: Minify and beautify JavaScript code
- **Features**:
  - Real-time minification with configurable options
  - Code beautification and formatting
  - Remove comments, whitespace, and mangle variable names
  - Copy to clipboard functionality
  - Modern green gradient UI theme

#### **Base64 Processor**
- **Purpose**: Encode and decode Base64 data
- **Features**:
  - Real-time Base64 encoding/decoding
  - File upload support
  - Copy to clipboard functionality
  - Modern blue gradient UI theme

## 🎨 Design Features

- **Modern UI Design**: Consistent gradient-based design system across all tools
- **Responsive Layout**: Mobile-friendly interface that works on all devices
- **Interactive Elements**: Smooth transitions, hover effects, and micro-interactions
- **Accessibility**: Semantic HTML and keyboard navigation support
- **Error Handling**: User-friendly error displays with helpful messages
- **Dark Mode Ready**: Consistent color schemes with proper contrast

## 🛠️ Technology Stack

- **Frontend**: Svelte + SvelteKit
- **Styling**: Tailwind CSS
- **Icons**: Iconify/Svelte
- **Build Tool**: Vite
- **Package Manager**: npm

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd data-tools

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
npm run dev -- --open
```

## 🚀 Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable UI components
│   └── plugin/        # Core functionality plugins
│       ├── iso8583/   # ISO8583 parsing logic
│       ├── swagger/    # Swagger generation logic
│       └── ...
├── routes/            # Page routes
│   ├── idm-swagger/      # IDM to Swagger converter
│   ├── iso8583-parser/   # ISO8583 parser
│   ├── dfdl-parser/       # DFDL parser
│   ├── js-minify/         # JavaScript minifier
│   ├── base64-decoder/     # Base64 processor
│   └── +page.svelte       # Main landing page
└── static/           # Static assets
```

## 🎯 Usage

1. **Navigate to Tools**: Use the main dashboard to select your desired tool
2. **Upload/Input Data**: Each tool provides intuitive input methods
3. **Configure Options**: Adjust settings as needed for your specific use case
4. **Process Data**: Click the process button to execute the transformation
5. **Download Results**: Export processed data in various formats

## 🔧 Configuration

Most tools include configurable options:
- **File Formats**: Support for various input/output formats
- **Processing Options**: Customizable parsing and transformation settings
- **Export Options**: Multiple output formats available
- **Storage**: Local storage for frequently used files and settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Svelte Team**: For the amazing framework
- **Tailwind CSS**: For the utility-first CSS framework
- **Iconify**: For the comprehensive icon library
- **OpenAPI Community**: For the Swagger/OpenAPI standards

---

Built with ❤️ using Svelte and modern web technologies.
