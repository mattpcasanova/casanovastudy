# CasanovaStudy - Study Guide Generator

A Next.js application that converts course materials (PDF/DOCX/TXT) into personalized study guides. Students can upload files, configure preferences, and get downloadable PDF study guides.

## 🚀 Features

- **File Upload**: Support for DOCX, TXT files (PDF temporarily disabled)
- **Smart Generation**: Intelligent study guide creation with Claude API
- **Multiple Formats**: Outline, flashcards, quiz, summary, concept-map
- **PDF Generation**: Beautiful, styled PDF output with Puppeteer
- **Email Delivery**: Send study guides via email
- **Responsive UI**: Modern interface with shadcn/ui components
- **TypeScript**: Full type safety throughout the application

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Claude API
- **PDF Generation**: Puppeteer
- **File Processing**: mammoth (DOCX), custom utilities
- **Email**: Nodemailer
- **Styling**: Tailwind CSS with custom theme

## 📋 Prerequisites

- Node.js 18+ 
- npm or pnpm
- Anthropic API key
- SMTP credentials for email functionality

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/mattpcasanova/casanovastudy.git
   cd casanovastudy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
casanovastudy/
├── app/
│   ├── api/                    # API routes
│   │   ├── upload/            # File upload endpoint
│   │   ├── generate-study-guide/ # Study guide generation
│   │   └── send-email/        # Email sending
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── upload-page.tsx        # File upload interface
│   └── results-page.tsx       # Study guide results
├── lib/
│   ├── claude-api.ts          # Claude API integration
│   ├── email-service.ts       # Email functionality
│   ├── file-processing.ts     # File processing utilities
│   ├── pdf-generator.ts       # PDF generation
│   └── utils.ts               # Utility functions
├── types/
│   └── index.ts               # TypeScript type definitions
└── public/
    └── study-guides/          # Generated PDF storage
```

## 🔧 API Endpoints

### POST /api/upload
Upload and process files for study guide generation.

**Request**: `FormData` with files
**Response**: Processed file data

### POST /api/generate-study-guide
Generate study guide from processed files.

**Request**: Study guide configuration
**Response**: Generated study guide with PDF URL

### POST /api/send-email
Send study guide via email.

**Request**: Email details and study guide ID
**Response**: Success status

## 🎨 Study Guide Formats

- **Outline**: Hierarchical structure with main topics and subtopics
- **Flashcards**: Question-answer pairs for memorization
- **Quiz**: Multiple choice, true/false, and short answer questions
- **Summary**: Comprehensive narrative summary
- **Concept Map**: Visual representation of concept relationships

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Claude API key for study guide generation | Yes |
| `SMTP_HOST` | SMTP server hostname | No |
| `SMTP_PORT` | SMTP server port | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🐛 Known Issues

- PDF processing is temporarily disabled due to build issues
- PPTX processing not yet implemented
- Email functionality requires SMTP configuration

## 🔮 Future Enhancements

- [ ] Implement proper PDF text extraction
- [ ] Add PPTX file processing
- [ ] User authentication and study guide history
- [ ] Batch processing for multiple study guides
- [ ] Advanced customization options
- [ ] Study guide templates
- [ ] Progress tracking and analytics

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, email support@casanovastudy.com or create an issue on GitHub.

---

Built with ❤️ for students and educators